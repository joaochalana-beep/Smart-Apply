import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, experience, skills, education, jobTitle, email, phone, linkedin, location } = body;

    const systemPrompt = `You are an expert resume writer who creates ATS-friendly resumes.

CRITICAL RULES:
- Do NOT include contact information (name, email, phone, LinkedIn, location) anywhere in the resume body.
- Do NOT write a header with the candidate's name or contact details.
- The PDF generator already renders name, job title, and contact info in a separate header.
- Only output these sections: PROFESSIONAL SUMMARY, WORK EXPERIENCE, EDUCATION, SKILLS.
- Keep the resume concise. Target 1-2 pages when printed. Avoid fluff.
- Use bold markdown headers: **SECTION NAME**
- Use bullet points starting with "- " for achievements and responsibilities.
- Use action verbs and include metrics/numbers where possible.
- Do not use markdown code blocks (no \`\`\`).
- Do not use tables, columns, or complex formatting.`;

    const userPrompt = `Create a professional resume for ${name} applying for a ${jobTitle} position.

Education: ${education}

Experience: ${experience}

Skills: ${skills}

Write a concise, achievement-focused resume.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
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