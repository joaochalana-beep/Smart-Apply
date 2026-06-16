import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ExperienceEntry = {
  company: string;
  role: string;
  duration: string;
  location: string;
  achievements: string[];
};

type SkillCategory = {
  category: string;
  skills: string[];
};

type FormData = {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  summary: string;
  targetJobDescription: string;
  experiences: ExperienceEntry[];
  skills: SkillCategory[];
  education: string;
  certifications: string;
  languages: string;
};

function extractKeywords(jobDescription: string): string[] {
  const commonStopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare",
    "ought", "used", "rarely", "seldom", "hardly", "scarcely", "barely", "never", "always",
    "often", "sometimes", "frequently", "usually", "generally", "typically", "normally",
    "commonly", "regularly", "constantly", "continuously", "repeatedly", "periodically",
    "occasionally", "routinely", "daily", "weekly", "monthly", "yearly", "annually",
    "we", "you", "they", "them", "their", "theirs", "themselves", "what", "which", "who",
    "whom", "whose", "this", "that", "these", "those", "am", "is", "are", "was", "were",
    "being", "been", "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "can", "could", "must", "ought", "need", "dare", "used",
    "about", "above", "across", "after", "against", "along", "among", "around", "before",
    "behind", "below", "beneath", "beside", "between", "beyond", "despite", "during",
    "except", "inside", "into", "near", "off", "onto", "outside", "over", "past", "since",
    "through", "throughout", "till", "toward", "under", "underneath", "until", "upon",
    "within", "without", "according", "because", "before", "both", "each", "either",
    "neither", "whether", "although", "though", "while", "whereas", "unless", "until",
    "since", "so", "than", "too", "very", "just", "now", "only", "own", "same", "so",
    "than", "too", "very", "also", "back", "still", "even", "only", "just", "already",
    "yet", "ever", "never", "always", "often", "sometimes", "usually", "generally",
    "typically", "normally", "commonly", "regularly", "constantly", "continuously",
    "repeatedly", "periodically", "occasionally", "routinely", "responsible", "duties",
    "tasks", "work", "job", "role", "position", "employment", "career", "professional",
  ]);

  const words = jobDescription
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !commonStopWords.has(w) && !/^\d+$/.test(w));

  const frequency: Record<string, number> = {};
  words.forEach(w => {
    frequency[w] = (frequency[w] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([word]) => word);
}

function calculateATSScore(resume: string, jobDescription: string, formData: FormData): { score: number; improvements: string[]; keywords: string[] } {
  const resumeLower = resume.toLowerCase();
  const jdKeywords = extractKeywords(jobDescription);
  const matchedKeywords: string[] = [];
  const improvements: string[] = [];

  // Keyword matching
  let keywordScore = 0;
  jdKeywords.forEach(kw => {
    if (resumeLower.includes(kw)) {
      keywordScore += 2;
      matchedKeywords.push(kw);
    }
  });
  keywordScore = Math.min(40, keywordScore);

  // Check for metrics/numbers
  const hasMetrics = /\d+%|\d+\s*(percent|x|times|fold|million|billion|k|thousand|hundred)|\$\d+|\d+\s*(users|customers|clients|tickets|calls|emails|days|hours|months|years)/i.test(resume);
  if (!hasMetrics) {
    improvements.push("Add specific metrics and numbers to your achievements (e.g., 'reduced response time by 20%')");
  }

  // Check for action verbs
  const actionVerbs = ["achieved", "improved", "increased", "decreased", "reduced", "enhanced", "optimized", "streamlined", "implemented", "developed", "created", "designed", "managed", "led", "coordinated", "collaborated", "negotiated", "resolved", "delivered", "executed", "launched", "spearheaded", "drove", "generated", "boosted", "transformed", "pioneered", "established", "built", "grew", "expanded", "secured", "won", "saved", "eliminated", "prevented", "mitigated", "detected", "identified", "investigated", "verified", "validated", "audited", "complied", "ensured", "maintained", "monitored", "tracked", "analyzed", "evaluated", "assessed", "reviewed", "processed", "handled", "managed", "supervised", "trained", "mentored", "supported", "assisted", "served", "responded", "communicated", "presented", "reported", "documented", "recorded", "updated", "maintained"];
  const verbCount = actionVerbs.filter(v => resumeLower.includes(v)).length;
  if (verbCount < 5) {
    improvements.push(`Use more action verbs at the start of bullet points. Found ${verbCount}, aim for 8+ (e.g., spearheaded, optimized, drove)`);
  }

  // Check section completeness
  const hasSummary = resumeLower.includes("professional summary") || resumeLower.includes("summary");
  const hasExperience = resumeLower.includes("work experience") || resumeLower.includes("experience");
  const hasSkills = resumeLower.includes("skills");
  const hasEducation = resumeLower.includes("education");

  if (!hasSummary) improvements.push("Add a Professional Summary section at the top");
  if (!hasExperience) improvements.push("Ensure Work Experience section is clearly labeled");
  if (!hasSkills) improvements.push("Add a Skills section with categorized competencies");
  if (!hasEducation) improvements.push("Add an Education section");

  // Check for soft skills fluff
  const softSkills = ["detail-oriented", "team player", "hardworking", "self-motivated", "enthusiastic", "passionate", "dedicated", "committed", "reliable", "punctual", "flexible", "adaptable", "quick learner", "good communication", "excellent communication"];
  const softSkillCount = softSkills.filter(s => resumeLower.includes(s)).length;
  if (softSkillCount > 3) {
    improvements.push("Reduce generic soft skills ('team player', 'hardworking'). Replace with specific achievements that demonstrate these traits");
  }

  // Check length
  const lineCount = resume.split("\n").filter(l => l.trim()).length;
  if (lineCount < 20) {
    improvements.push("Resume seems short. Add more detail to your experience and achievements");
  } else if (lineCount > 80) {
    improvements.push("Resume may be too long. Aim for 1-2 pages. Trim older or less relevant experience");
  }

  // Check for job title alignment
  const targetTitle = formData.jobTitle.toLowerCase();
  if (!resumeLower.includes(targetTitle) && targetTitle.length > 3) {
    improvements.push(`Include your target job title '${formData.jobTitle}' somewhere in your resume (summary or skills section)`);
  }

  // Calculate final score
  let score = 50; // Base score
  score += keywordScore;
  if (hasMetrics) score += 15;
  score += Math.min(15, verbCount * 2);
  if (hasSummary) score += 5;
  if (hasExperience) score += 5;
  if (hasSkills) score += 5;
  if (hasEducation) score += 5;
  if (softSkillCount <= 3) score += 5;
  if (lineCount >= 20 && lineCount <= 80) score += 5;

  return {
    score: Math.min(100, Math.max(0, score)),
    improvements,
    keywords: matchedKeywords.slice(0, 15),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: FormData = await request.json();

    // Extract keywords from job description for tailoring
    const jdKeywords = body.targetJobDescription ? extractKeywords(body.targetJobDescription) : [];

    const systemPrompt = `You are an elite ATS optimization expert and resume writer. You create resumes that pass Applicant Tracking Systems and impress human recruiters.

CRITICAL RULES FOR RESUME:
- Output ONLY these sections: **PROFESSIONAL SUMMARY**, **WORK EXPERIENCE**, **SKILLS**, **EDUCATION**, **CERTIFICATIONS** (if any)
- Do NOT include name, contact info, or any header — the PDF renderer handles that separately
- Use **SECTION NAME** for headers (bold markdown)
- Use "- " bullet points for all achievements
- Every bullet must start with a strong action verb
- Include specific metrics, numbers, and percentages in every bullet where possible
- Mirror language from the job description keywords provided
- Use industry-standard terminology
- Keep bullets concise: 1-2 lines max
- Prioritize recency and relevance
- For older roles, use fewer bullets
- Target 1-2 pages when printed
- No tables, columns, or complex formatting
- No markdown code blocks`;

    const userPromptResume = `Create an ATS-optimized resume for someone applying to: "${body.jobTitle}"

${body.targetJobDescription ? `TARGET JOB DESCRIPTION KEYWORDS TO INCLUDE: ${jdKeywords.join(", ")}

JOB DESCRIPTION:
${body.targetJobDescription}

Tailor the resume specifically for this role. Mirror the language and priorities from the job description.` : "Create a versatile resume optimized for this role type."}

PERSONAL SUMMARY (use or enhance): ${body.summary || "Not provided — generate based on experience"}

WORK EXPERIENCE:
${body.experiences.map((exp, i) => `
${i + 1}. ${exp.role} at ${exp.company} (${exp.duration})${exp.location ? ` — ${exp.location}` : ""}
Achievements:
${exp.achievements.filter(a => a.trim()).map(a => `- ${a}`).join("\n")}
`).join("\n")}

SKILLS BY CATEGORY:
${body.skills.map(cat => `${cat.category}: ${cat.skills.filter(s => s.trim()).join(", ")}`).join("\n")}

EDUCATION: ${body.education}

${body.certifications ? `CERTIFICATIONS: ${body.certifications}` : ""}

${body.languages ? `LANGUAGES: ${body.languages}` : ""}

Generate a concise, powerful, ATS-friendly resume.`;

    const systemPromptCL = `You are an expert cover letter writer. You write compelling, personalized cover letters that get interviews.

CRITICAL RULES FOR COVER LETTER:
- Professional but personable tone
- 3-4 paragraphs max
- Hook the reader in paragraph 1
- Connect specific experience to job requirements
- Show enthusiasm for the company/role
- End with a strong call to action
- No generic fluff
- Address specific requirements from the job description`;

    const userPromptCL = `Write a compelling cover letter for ${body.name} applying to the "${body.jobTitle}" position.

${body.targetJobDescription ? `JOB DESCRIPTION:
${body.targetJobDescription}` : ""}

CANDIDATE BACKGROUND:
- Target role: ${body.jobTitle}
- Experience: ${body.experiences.map(e => `${e.role} at ${e.company} (${e.duration})`).join("; ")}
- Key skills: ${body.skills.map(c => c.skills.filter(s => s.trim()).join(", ")).join("; ")}
- Education: ${body.education}
${body.languages ? `- Languages: ${body.languages}` : ""}

Write a cover letter that:
1. Opens with why they're excited about this specific role
2. Highlights 2-3 most relevant achievements with metrics
3. Connects their skills to the job requirements
4. Closes with enthusiasm and a call to action`;

    // Generate resume
    const resumeCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptResume },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    // Generate cover letter
    const clCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPromptCL },
        { role: "user", content: userPromptCL },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    const resume = resumeCompletion.choices[0].message.content?.replace(/```plaintext/g, "").replace(/```/g, "").trim() || "";
    const coverLetter = clCompletion.choices[0].message.content?.replace(/```plaintext/g, "").replace(/```/g, "").trim() || "";

    // Calculate ATS score
    const { score, improvements, keywords } = calculateATSScore(resume, body.targetJobDescription || "", body);

    return NextResponse.json({
      resume,
      coverLetter,
      atsScore: score,
      improvements,
      keywords,
    });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 }
    );
  }
}