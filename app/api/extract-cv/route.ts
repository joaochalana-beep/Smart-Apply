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
  "email": "Email address",
  "phone": "Phone number",
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
      "achievements": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "skills": [
    {
      "category": "Technical",
      "skills": ["Skill 1", "Skill 2"]
    },
    {
      "category": "Soft Skills", 
      "skills": ["Skill 3", "Skill 4"]
    }
  ],
  "education": "Education details as a single string. Include ALL education entries separated by line breaks",
  "certifications": "Certifications as a string",
  "languages": "Languages as a string"
}

CRITICAL RULES:
- Extract ALL work experiences found in the CV, not just the most recent
- Each experience MUST have achievements as an array of strings
- Convert paragraph job descriptions into 3-5 bullet-point achievements
- Include metrics and numbers in achievements where found
- Group ALL skills into categorized arrays (Technical, Soft Skills, Languages, Tools, etc.)
- Education should include ALL degrees, schools, and years as one formatted string
- If you cannot find a field, use empty string "" or empty array []
- Return ONLY the JSON object, no markdown, no explanation`
        },
        {
          role: "user",
          content: `Parse this CV:\n\n${truncatedText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2500,
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

    // Ensure experiences is always an array with proper structure
    let experiences = [];
    if (Array.isArray(parsed.experiences)) {
      experiences = parsed.experiences.map((exp: any) => ({
        company: exp.company || "",
        role: exp.role || "",
        duration: exp.duration || "",
        location: exp.location || "",
        achievements: Array.isArray(exp.achievements) && exp.achievements.length > 0
          ? exp.achievements
          : [exp.description || exp.responsibilities || ""],
      }));
    } else if (typeof parsed.experience === "string") {
      // Fallback: try to parse if API returned old format
      try {
        const parsedExp = JSON.parse(parsed.experience);
        if (Array.isArray(parsedExp)) {
          experiences = parsedExp.map((exp: any) => ({
            company: exp.company || "",
            role: exp.role || exp.title || "",
            duration: exp.duration || exp.period || "",
            location: exp.location || "",
            achievements: Array.isArray(exp.description) 
              ? exp.description 
              : [exp.description || ""],
          }));
        }
      } catch (e) {
        experiences = [{ company: "", role: "", duration: "", location: "", achievements: [""] }];
      }
    }

    // Ensure skills is always an array of objects
    let skills = [];
    if (Array.isArray(parsed.skills)) {
      // Check if it's already in {category, skills[]} format
      if (parsed.skills.length > 0 && typeof parsed.skills[0] === "object" && parsed.skills[0].category) {
        skills = parsed.skills.map((cat: any) => ({
          category: cat.category || "Technical",
          skills: Array.isArray(cat.skills) ? cat.skills : [cat.skills || ""],
        }));
      } else {
        // It's a flat array of skill strings - group them
        skills = [{ category: "Technical", skills: parsed.skills }];
      }
    } else if (typeof parsed.skills === "string") {
      // Comma-separated string
      const skillList = parsed.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
      skills = [{ category: "Technical", skills: skillList.length > 0 ? skillList : [""] }];
    }

    // Ensure education is a string
    let education = "";
    if (typeof parsed.education === "string") {
      education = parsed.education;
    } else if (Array.isArray(parsed.education)) {
      education = parsed.education.map((edu: any) => 
        typeof edu === "string" ? edu : `${edu.degree || ""} at ${edu.school || ""} (${edu.year || ""})`
      ).join("\n");
    }

    // Build final response
    const result = {
      name: parsed.name || parsed.full_name || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
      location: parsed.location || "",
      linkedin: parsed.linkedin || "",
      jobTitle: parsed.jobTitle || "",
      summary: parsed.summary || "",
      experiences: experiences.length > 0 ? experiences : [{ company: "", role: "", duration: "", location: "", achievements: [""] }],
      skills: skills.length > 0 ? skills : [{ category: "Technical", skills: [""] }],
      education: education,
      certifications: parsed.certifications || "",
      languages: parsed.languages || "",
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("CV extraction error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse CV" }, { status: 500 });
  }
}