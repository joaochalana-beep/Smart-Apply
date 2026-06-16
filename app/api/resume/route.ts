"use server";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type FormData = {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  summary: string;
  targetJobDescription: string;
  experiences: Array<{
    company: string;
    role: string;
    duration: string;
    location: string;
    achievements: string[];
  }>;
  skills: Array<{
    category: string;
    skills: string[];
  }>;
  education: string;
  certifications: string;
  languages: string;
};

function calculateATSScore(resume: string, jobDescription: string, formData: FormData): { score: number; improvements: string[]; keywords: string[] } {
  const resumeLower = resume.toLowerCase();
  const improvements: string[] = [];
  const matchedKeywords: string[] = [];

  // Extract meaningful keywords from JD (filter out generic words)
  const genericWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare",
    "we", "you", "they", "them", "their", "this", "that", "these", "those", "am", "is", "are",
    "about", "above", "across", "after", "against", "along", "among", "around", "before", "behind",
    "below", "beneath", "beside", "between", "beyond", "despite", "during", "except", "inside",
    "into", "near", "off", "onto", "outside", "over", "past", "since", "through", "throughout",
    "till", "toward", "under", "underneath", "until", "upon", "within", "without", "according",
    "because", "both", "each", "either", "neither", "whether", "although", "though", "while",
    "whereas", "unless", "since", "so", "than", "too", "very", "just", "now", "only", "own",
    "same", "also", "back", "still", "even", "already", "yet", "ever", "never", "always", "often",
    "sometimes", "usually", "generally", "typically", "normally", "commonly", "regularly", "routinely",
    "responsible", "duties", "tasks", "work", "job", "role", "position", "employment", "career",
    "professional", "what", "which", "who", "whom", "whose", "how", "when", "where", "why",
    "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", "just", "should",
    "now", "here", "there", "up", "down", "out", "if", "about", "into", "through", "during",
    "before", "after", "above", "below", "between", "under", "again", "further", "then", "once",
    "data", "user", "based", "online", "high", "reviewing", "environment", "requirements",
  ]);

  // Extract multi-word phrases and important terms
  const jdText = jobDescription.toLowerCase();
  const words = jdText.replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length >= 4 && !genericWords.has(w));
  
  const frequency: Record<string, number> = {};
  words.forEach(w => { frequency[w] = (frequency[w] || 0) + 1; });
  
  // Also extract 2-word phrases
  const phrases: string[] = [];
  const wordList = jdText.replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length >= 3);
  for (let i = 0; i < wordList.length - 1; i++) {
    const phrase = `${wordList[i]} ${wordList[i + 1]}`;
    if (!genericWords.has(wordList[i]) && !genericWords.has(wordList[i + 1])) {
      phrases.push(phrase);
    }
  }
  
  const topWords = Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w);
  const topPhrases = [...new Set(phrases)].slice(0, 15);
  
  // Check keyword matches
  let keywordScore = 0;
  topWords.forEach(kw => {
    if (resumeLower.includes(kw)) {
      keywordScore += 3;
      matchedKeywords.push(kw);
    }
  });
  topPhrases.forEach(phrase => {
    if (resumeLower.includes(phrase)) {
      keywordScore += 5;
      if (!matchedKeywords.includes(phrase)) matchedKeywords.push(phrase);
    }
  });
  keywordScore = Math.min(35, keywordScore);

  // CRITICAL: Exact job title match
  const targetTitle = formData.jobTitle.toLowerCase().replace(/[^\w\s]/g, "");
  const titleWords = targetTitle.split(/\s+/).filter(w => w.length > 2);
  let titleMatchScore = 0;
  
  // Check if full title appears
  if (resumeLower.includes(targetTitle)) {
    titleMatchScore = 25;
  } else {
    // Check individual words
    let matchedTitleWords = 0;
    titleWords.forEach(w => {
      if (resumeLower.includes(w)) matchedTitleWords++;
    });
    if (matchedTitleWords === titleWords.length) titleMatchScore = 20;
    else if (matchedTitleWords >= Math.ceil(titleWords.length / 2)) titleMatchScore = 10;
    else titleMatchScore = Math.max(0, matchedTitleWords * 3);
  }
  
  if (titleMatchScore < 20) {
    improvements.push(`Include your target job title '${formData.jobTitle}' prominently in your Professional Summary or header`);
  }

  // Check for metrics/numbers
  const hasMetrics = /\d+%|\d+\s*(percent|x|times|fold|million|billion|k|thousand|hundred)|\$\d+|\d+\s*(users|customers|clients|tickets|calls|emails|days|hours|months|years|pieces|items)/i.test(resume);
  if (!hasMetrics) {
    improvements.push("Add specific metrics and numbers to achievements (e.g., 'improved resolution time by 30%')");
  }

  // Check for action verbs
  const actionVerbs = ["achieved", "improved", "increased", "decreased", "reduced", "enhanced", "optimized", "streamlined", "implemented", "developed", "created", "designed", "managed", "led", "coordinated", "collaborated", "negotiated", "resolved", "delivered", "executed", "launched", "spearheaded", "drove", "generated", "boosted", "transformed", "pioneered", "established", "built", "grew", "expanded", "secured", "won", "saved", "eliminated", "prevented", "mitigated", "detected", "identified", "investigated", "verified", "validated", "audited", "complied", "ensured", "maintained", "monitored", "tracked", "analyzed", "evaluated", "assessed", "reviewed", "processed", "handled", "supervised", "trained", "mentored", "supported", "assisted", "served", "responded", "communicated", "presented", "reported", "documented", "recorded", "updated", "scaled", "enforced", "escalated", "flagged"];
  const verbCount = actionVerbs.filter(v => resumeLower.includes(v)).length;
  if (verbCount < 5) {
    improvements.push(`Use more action verbs at bullet starts. Found ${verbCount}, aim for 8+ (e.g., spearheaded, optimized, drove)`);
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
  const softSkills = ["detail-oriented", "team player", "hardworking", "self-motivated", "enthusiastic", "passionate", "dedicated", "committed", "reliable", "punctual", "flexible", "adaptable", "quick learner", "good communication", "excellent communication", "strong work ethic", "go-getter", "self-starter"];
  const softSkillCount = softSkills.filter(s => resumeLower.includes(s)).length;
  if (softSkillCount > 2) {
    improvements.push("Reduce generic soft skills ('team player', 'hardworking'). Replace with specific achievements");
  }

  // Check length
  const lineCount = resume.split("\n").filter(l => l.trim()).length;
  if (lineCount < 15) {
    improvements.push("Resume seems short. Add more detail to experience and achievements");
  } else if (lineCount > 100) {
    improvements.push("Resume may be too long. Aim for 1-2 pages. Trim older experience");
  }

  // Language check if specified
  if (formData.languages) {
    const langList = formData.languages.toLowerCase().split(/[,;]/).map(l => l.trim());
    langList.forEach(lang => {
      if (lang.length > 2 && !resumeLower.includes(lang)) {
        improvements.push(`Mention '${lang}' in your skills or summary section`);
      }
    });
  }

  // Calculate final score — START LOWER, ADD UP
  let score = 30; // Base
  
  score += keywordScore;
  score += titleMatchScore;
  if (hasMetrics) score += 15;
  score += Math.min(10, verbCount);
  if (hasSummary) score += 5;
  if (hasExperience) score += 5;
  if (hasSkills) score += 5;
  if (hasEducation) score += 5;
  if (softSkillCount <= 2) score += 5;
  if (lineCount >= 15 && lineCount <= 100) score += 5;
  
  // PENALTY: If there are critical improvements, cap the score
  const criticalIssues = improvements.filter(i => 
    i.includes("target job title") || 
    i.includes("metrics") || 
    i.includes("short") ||
    i.includes("too long")
  ).length;
  
  if (criticalIssues >= 2) {
    score = Math.min(score, 75);
  }
  if (criticalIssues >= 3) {
    score = Math.min(score, 60);
  }
  
  // NEVER return 100 if there are improvements
  if (improvements.length > 0) {
    score = Math.min(score, 95);
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    improvements,
    keywords: matchedKeywords.slice(0, 15),
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData: FormData = await request.json();

    const systemPrompt = `You are an expert resume writer and career coach. You specialize in creating ATS-optimized resumes and cover letters that pass automated screening systems while remaining human-readable.

Rules for resume generation:
1. Use the exact job title provided by the user prominently in the Professional Summary and header
2. Include keywords from the job description naturally throughout
3. Use strong action verbs at the start of every bullet point
4. Include specific metrics and numbers where possible
5. Keep formatting clean with clear section headers
6. Avoid generic soft skills ("team player", "hardworking") — replace with specific achievements
7. Tailor experience bullets to match the job description requirements
8. Use a professional, modern format

Output format:
**PROFESSIONAL SUMMARY**
[2-3 sentences tailored to the job]

**WORK EXPERIENCE**
[Company] | [Role] | [Duration] | [Location]
- Achievement with metric
- Achievement with metric
...

**SKILLS**
[Category]: [skill, skill, skill]
...

**EDUCATION**
[Education details]

**CERTIFICATIONS** (if applicable)
[Certification details]

Rules for cover letter:
1. Use today's date at the top (format: Month Day, Year — e.g., "June 16, 2026")
2. Address as "Dear Hiring Manager," — do NOT include company name, company address, or [Company Address] placeholder
3. Mention 2-3 key requirements from the job description and how the candidate meets them
4. Include specific achievements with metrics
5. Keep it to 3-4 paragraphs
6. Professional but enthusiastic tone
7. End with a call to action

Cover letter format:
[Month Day, Year]

Dear Hiring Manager,

[Body paragraphs]

Sincerely,
[Candidate Name]`;

    const userPrompt = `Generate an ATS-optimized resume and cover letter for this candidate applying for: ${formData.jobTitle}

JOB DESCRIPTION:
${formData.targetJobDescription}

CANDIDATE INFORMATION:
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
LinkedIn: ${formData.linkedin}
Location: ${formData.location}
${formData.summary ? `Summary: ${formData.summary}` : ""}

WORK EXPERIENCE:
${formData.experiences.map(exp => `
Company: ${exp.company}
Role: ${exp.role}
Duration: ${exp.duration}
Location: ${exp.location}
Achievements:
${exp.achievements.filter(a => a.trim()).map(a => `- ${a}`).join("\n")}
`).join("\n")}

SKILLS:
${formData.skills.map(cat => `${cat.category}: ${cat.skills.filter(s => s.trim()).join(", ")}`).join("\n")}

EDUCATION:
${formData.education}

CERTIFICATIONS:
${formData.certifications}

LANGUAGES:
${formData.languages}

Generate both the resume and cover letter. Separate them clearly with "=== COVER LETTER ==="`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = completion.choices[0].message.content || "";
    
    // Split resume and cover letter
    const parts = content.split("=== COVER LETTER ===");
    const resume = parts[0].trim();
    const coverLetter = parts[1]?.trim() || "Cover letter generation failed. Please try again.";

    // Calculate ATS score
    const atsResult = calculateATSScore(resume, formData.targetJobDescription, formData);

    return NextResponse.json({
      resume,
      coverLetter,
      atsScore: atsResult.score,
      improvements: atsResult.improvements,
      keywords: atsResult.keywords,
    });
  } catch (error) {
    console.error("Resume generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate resume. Please try again." },
      { status: 500 }
    );
  }
}