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
          content: `You are an expert CV parser. Extract ALL information from the CV text.

Return ONLY a valid JSON object. Do NOT use markdown code blocks. Do NOT add explanations.

The JSON must have this EXACT structure:
{
  "name": "string",
  "email": "string", 
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "jobTitle": "string",
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

MANDATORY RULES:
- Extract EVERY single job/work entry found in the CV
- Each job must have achievements as an array of 3-5 bullet strings
- If the CV lists jobs with paragraphs, convert each paragraph into bullet achievements
- Include ALL education: degrees, schools, dates, certifications
- Group ALL skills found into categories
- NEVER return empty arrays unless truly nothing was found
- NEVER wrap the response in markdown`
        },
        {
          role: "user",
          content: truncatedText
        }
      ],
      temperature: 0.1,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content || "{}";
    console.log("Raw OpenAI response:", content);

    const parsed = JSON.parse(content);
    console.log("Parsed JSON:", JSON.stringify(parsed, null, 2));

    // Normalize experiences
    let experiences: any[] = [];
    
    if (Array.isArray(parsed.experiences) && parsed.experiences.length > 0) {
      experiences = parsed.experiences.map((exp: any) => ({
        company: String(exp.company || ""),
        role: String(exp.role || ""),
        duration: String(exp.duration || ""),
        location: String(exp.location || ""),
        achievements: Array.isArray(exp.achievements) && exp.achievements.length > 0
          ? exp.achievements.map(String)
          : [String(exp.description || exp.responsibilities || "")],
      }));
    } else if (Array.isArray(parsed.experience) && parsed.experience.length > 0) {
      experiences = parsed.experience.map((exp: any) => ({
        company: String(exp.company || ""),
        role: String(exp.role || exp.title || ""),
        duration: String(exp.duration || exp.period || ""),
        location: String(exp.location || ""),
        achievements: Array.isArray(exp.achievements) 
          ? exp.achievements.map(String)
          : Array.isArray(exp.description)
            ? exp.description.map(String)
            : [String(exp.description || exp.responsibilities || "")],
      }));
    } else if (typeof parsed.experience === "string" && parsed.experience.trim()) {
      try {
        const parsedExp = JSON.parse(parsed.experience);
        if (Array.isArray(parsedExp)) {
          experiences = parsedExp.map((exp: any) => ({
            company: String(exp.company || ""),
            role: String(exp.role || exp.title || ""),
            duration: String(exp.duration || exp.period || ""),
            location: String(exp.location || ""),
            achievements: Array.isArray(exp.achievements) 
              ? exp.achievements.map(String)
              : [String(exp.description || "")],
          }));
        }
      } catch (e) {
        console.log("Failed to parse experience string:", parsed.experience);
      }
    }

    // Normalize skills
    let skills: any[] = [];
    
    if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
      if (typeof parsed.skills[0] === "object" && parsed.skills[0].category) {
        skills = parsed.skills.map((cat: any) => ({
          category: String(cat.category || "Technical"),
          skills: Array.isArray(cat.skills) && cat.skills.length > 0
            ? cat.skills.map(String)
            : [""],
        }));
      } else {
        // Flat array of strings
        skills = [{ category: "Technical", skills: parsed.skills.map(String) }];
      }
    } else if (typeof parsed.skills === "string" && parsed.skills.trim()) {
      const skillList = parsed.skills.split(/,|;/).map((s: string) => s.trim()).filter(Boolean);
      skills = [{ category: "Technical", skills: skillList.length > 0 ? skillList : [""] }];
    }

    // Normalize education
    let education = "";
    if (typeof parsed.education === "string") {
      education = parsed.education;
    } else if (Array.isArray(parsed.education)) {
      education = parsed.education.map((edu: any) => 
        typeof edu === "string" ? edu : `${edu.degree || ""} at ${edu.school || ""} (${edu.year || ""})`
      ).filter(Boolean).join("\n");
    }

    const result = {
      name: String(parsed.name || parsed.full_name || ""),
      email: String(parsed.email || ""),
      phone: String(parsed.phone || ""),
      location: String(parsed.location || ""),
      linkedin: String(parsed.linkedin || ""),
      jobTitle: String(parsed.jobTitle || parsed.job_title || ""),
      summary: String(parsed.summary || ""),
      experiences: experiences.length > 0 ? experiences : [{ company: "", role: "", duration: "", location: "", achievements: [""] }],
      skills: skills.length > 0 ? skills : [{ category: "Technical", skills: [""] }],
      education: education,
      certifications: String(parsed.certifications || ""),
      languages: String(parsed.languages || ""),
    };

    console.log("Final result:", JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("CV extraction error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse CV" }, { status: 500 });
  }
}