import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rawText } = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Truncate if too long (OpenAI has token limits)
    const truncatedText = rawText.slice(0, 8000);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a CV parser. The input text may have formatting artifacts, extra spaces, or character duplication from PDF extraction. Clean it up and extract the correct information.

Extract structured data and return ONLY a valid JSON object with this exact structure:
{
  "full_name": "correct full name - fix any character duplication or artifacts",
  "email": "correct email address - fix any extra characters or duplication",
  "phone": "correct phone number",
  "location": "correct location",
  "linkedin": "linkedin URL or empty string",
  "skills": "comma-separated skills list",
  "experience": "JSON string of array of objects with company, role, duration, description",
  "education": "JSON string of array of objects with school, degree, year",
  "summary": "professional summary paragraph"
}

IMPORTANT: 
- Fix any obvious character duplication (e.g., "joaocchalanaj" should be "joaochalana")
- Remove extra spaces in email addresses
- Return ONLY the JSON object, no markdown, no explanation`
          },
          {
            role: "user",
            content: `Parse this CV:\n\n${truncatedText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json({ error: "OpenAI API failed", details: errorData }, { status: 500 });
    }

    const openaiData = await openaiRes.json();
    const parsedContent = openaiData.choices?.[0]?.message?.content;

    if (!parsedContent) {
      return NextResponse.json({ error: "Empty response from OpenAI" }, { status: 500 });
    }

    // Clean up the response
    let cleanContent = parsedContent.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/```json\n?/, "").replace(/\n?```/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/```\n?/, "").replace(/\n?```/, "");
    }

    let parsedProfile;
    try {
      parsedProfile = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("JSON parse error. Content was:", cleanContent);
      return NextResponse.json({ 
        error: "Failed to parse AI response as JSON", 
        rawResponse: cleanContent 
      }, { status: 500 });
    }

    // Save to Supabase
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        user_id: userId,
        ...parsedProfile,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("AI parse error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}