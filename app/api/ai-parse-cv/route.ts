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

The CV text is extracted from a PDF and may have formatting artifacts. Look carefully for information that might be split across lines or mixed with noise.

Return ONLY a valid JSON object with this exact structure:
{
  "full_name": "Full name as it appears on the CV header",
  "email": "Email address - look for text containing @ symbol, often near the top",
  "phone": "Phone number - look for sequences of digits, + signs, parentheses, dashes. Common formats: +351..., (123) 456-7890, 123-456-7890. Ignore random long digit strings that don't look like phone numbers",
  "location": "City, country, or address. Look for city names, country names, or 'Based in...' text",
  "linkedin": "LinkedIn URL if found, otherwise empty string",
  "skills": "ALL skills mentioned, comma-separated",
  "experience": "JSON array of work experiences with company, role, duration, description",
  "education": "JSON array of education entries with school, degree, year",
  "summary": "Professional summary or generate one based on experience"
}

EXTRACTION RULES:
- The header of the CV (top section) usually contains: name, email, phone, location, LinkedIn
- Email always contains @ and a domain like .com, .pt, etc.
- Phone numbers are usually 7-15 digits with optional +, spaces, dashes, parentheses
- Location is usually a city name, sometimes with country
- If you cannot find a field, use empty string ""
- Clean up any PDF extraction artifacts or duplicated text
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