import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, experience, skills, education, jobTitle } = body;

    const prompt = `Write a professional resume for someone applying for a ${jobTitle} position.

Name: ${name}
Education: ${education}
Experience: ${experience}
Skills: ${skills}

Format it as a clean, ATS-friendly resume with:
- A brief professional summary
- Work experience with bullet points highlighting achievements
- Skills section
- Education section

Use professional language and action verbs.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const resume = completion.choices[0].message.content;

    return NextResponse.json({ resume });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 }
    );
  }
}