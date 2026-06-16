import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("cv") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let text = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdf = require("pdf-parse/lib/pdf-parse.js");
      const pdfData = await pdf(buffer);
      text = pdfData.text;
    } else {
      text = await file.text();
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a CV parser. Extract structured information from the provided CV text and return ONLY a JSON object with this exact structure:
{
  "name": "string",
  "jobTitle": "string",
  "email": "string",
  "phone": "string",
  "linkedin": "string",
  "location": "string",
  "summary": "string",
  "experiences": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "location": "string",
      "achievements": ["string", "string"]
    }
  ],
  "skills": [
    {
      "category": "string",
      "skills": ["string", "string"]
    }
  ],
  "education": "string",
  "certifications": "string",
  "languages": "string"
}

Rules:
- Extract ALL work experiences found
- Convert paragraphs into bullet-point achievements
- Infer skill categories from context
- If a field is not found, use empty string or empty array
- Return ONLY valid JSON, no markdown`
        },
        {
          role: "user",
          content: `Parse this CV:\n\n${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    });

    const content = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json/g, "").replace(/```/g, "").trim());

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("CV extraction error:", error);
    return NextResponse.json({ error: "Failed to parse CV" }, { status: 500 });
  }
}