import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, experience, skills, education, jobTitle, email, phone, linkedin, location } = body;

    const prompt = `Write a professional resume for ${name} applying for a ${jobTitle} position.

${location ? `Location: ${location}` : ""}
${email ? `Email: ${email}` : ""}
${phone ? `Phone: ${phone}` : ""}
${linkedin ? `LinkedIn: ${linkedin}` : ""}

Education: ${education}
Experience: ${experience}
Skills: ${skills}

Format it as a clean, professional resume with:
- Contact information at the top
- A brief professional summary (2-3 sentences)
- Work experience with bullet points highlighting achievements and metrics
- Skills section organized by category
- Education section

Use professional language, action verbs, and include specific metrics where possible. Do not use markdown code blocks.`;

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