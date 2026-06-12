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
            content: `You are an expert CV parser. Extract ALL possible information from the provided CV text.

Return ONLY a valid JSON object with this exact structure:
{
  "full_name": "Full name as it appears on the CV",
  "email": "Email address found on the CV - look for @ symbol",
  "phone": "Phone number - any format found",
  "location": "City, country, or address found",
  "linkedin": "LinkedIn URL if found, otherwise empty string",
  "skills": "ALL skills mentioned, comma-separated. Include technical skills, soft skills, languages, tools, software, certifications",
  "experience": "JSON array of ALL work experiences with company, role, duration, description",
  "education": "JSON array of ALL education entries with school, degree, year",
  "summary": "Professional summary or objective from the CV, or generate a brief one based on experience"
}

EXTRACTION RULES:
- Search the ENTIRE text carefully for email addresses (contain @)
- Search for phone numbers (any format with digits)
- Search for location/address information
- Extract ALL skills, not just a few - be comprehensive
- Include ALL work experiences, even older ones
- Include ALL education entries
- If a field is truly not found, use empty string "" not null
- Fix any obvious text artifacts or duplication from PDF extraction
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