import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const truncatedText = text.slice(0, 8000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert CV parser. Extract ALL possible information from the provided CV text.

The CV text is extracted from a PDF and may have formatting artifacts. Look carefully for information that might be split across lines or mixed with noise.

Return ONLY a valid JSON object with this exact structure:
{
  "name": "Full name as it appears on the CV header",
  "email": "Email address - look for text containing @ symbol, often near the top",
  "phone": "Phone number - look for sequences of digits, + signs, parentheses, dashes",
  "location": "City, country, or address",
  "linkedin": "LinkedIn URL if found, otherwise empty string",
  "jobTitle": "Most recent job title or target role inferred from the CV",
  "summary": "Professional summary or generate one based on experience",
  "experiences": [
    {
      "company": "Company name",
      "role": "Job title",
      "duration": "Employment period",
      "location": "Work location if mentioned",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "skills": [
    {
      "category": "Technical",
      "skills": ["Skill 1", "Skill 2"]
    }
  ],
  "education": "Education details as a string",
  "certifications": "Certifications as a string",
  "languages": "Languages as a string"
}

EXTRACTION RULES:
- The header of the CV usually contains: name, email, phone, location, LinkedIn
- Email always contains @ and a domain like .com, .pt, etc.
- Phone numbers are usually 7-15 digits with optional +, spaces, dashes, parentheses
- For experiences, extract ALL work history found in the CV
- Convert paragraph descriptions into bullet-point achievements
- Group skills by category (Technical, Soft Skills, Languages, etc.)
- If you cannot find a field, use empty string "" or empty array []
- Return ONLY the JSON object, no markdown, no explanation`
        },
        {
          role: "user",
          content: `Parse this CV:\n\n${truncatedText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content || "{}";
    
    // Clean markdown code blocks
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/```json\n?/, "").replace(/\n?```/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/```\n?/, "").replace(/\n?```/, "");
    }

    const parsed = JSON.parse(cleanContent);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("CV extraction error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse CV" }, { status: 500 });
  }
}