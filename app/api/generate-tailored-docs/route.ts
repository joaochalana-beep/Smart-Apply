import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobUrl, jobDescription } = await req.json();

  // Fetch user's profile
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "No profile found. Please upload your CV first." }, { status: 400 });
  }

  // Save the job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      company: extractCompany(jobDescription),
      role: extractRole(jobDescription),
      description: jobDescription,
      url: jobUrl,
    })
    .select()
    .single();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  // Generate tailored docs with OpenAI
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
          content: `You are an expert resume and cover letter writer. Your task is to analyze a job description and a candidate's profile, then generate:
1. A tailored resume optimized for the job
2. A compelling cover letter
3. A list of matched skills (from the candidate's profile that fit the job)
4. A list of missing skills (required by the job but not in the candidate's profile)

Return ONLY a valid JSON object with this structure:
{
  "jobRole": "extracted job title",
  "jobCompany": "extracted company name or unknown",
  "resume": "full tailored resume text with proper formatting",
  "coverLetter": "full cover letter text",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"]
}`
        },
        {
          role: "user",
          content: `CANDIDATE PROFILE:
Name: ${profile.full_name}
Email: ${profile.email}
Phone: ${profile.phone}
Location: ${profile.location}
LinkedIn: ${profile.linkedin || "Not provided"}
Skills: ${profile.skills}
Experience: ${profile.experience}
Education: ${profile.education}
Summary: ${profile.summary}

JOB DESCRIPTION:
${jobDescription}

IMPORTANT: Use the candidate's ACTUAL contact information in the resume header:
- Name: ${profile.full_name}
- Email: ${profile.email}
- Phone: ${profile.phone}
- Location: ${profile.location}

Do NOT use placeholder brackets like [Your Address]. Use the real data provided above.

Generate the tailored resume, cover letter, and skills analysis.`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });

  const openaiData = await openaiRes.json();
  const content = openaiData.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
  }

  // Clean and parse JSON
  let cleanContent = content.trim();
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.replace(/```json\n?/, "").replace(/\n?```/, "");
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/```\n?/, "").replace(/\n?```/, "");
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanContent);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: cleanContent }, { status: 500 });
  }

  return NextResponse.json({
    ...parsed,
    jobId: job.id,
  });
}

// Simple extraction helpers
function extractCompany(description: string): string {
  const match = description.match(/(?:at|with|join|for)\s+([A-Z][A-Za-z0-9\s&]+)/i);
  return match?.[1]?.trim() || "Unknown Company";
}

function extractRole(description: string): string {
  const lines = description.split("\n").slice(0, 5);
  for (const line of lines) {
    if (line.includes("Engineer") || line.includes("Manager") || line.includes("Specialist") || line.includes("Developer")) {
      return line.trim();
    }
  }
  return "Unknown Role";
}