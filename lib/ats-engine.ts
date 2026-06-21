// ATS-Optimized CV & Cover Letter Engine
// Local, rule-based generation that maximizes keyword coverage for HR AI/ATS systems.

export interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface EducationEntry {
  school: string;
  degree: string;
  year: string;
}

export interface UserProfile {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  summary?: string;
  skills?: string | string[];
  experience?: string | ExperienceEntry[];
  education?: string | EducationEntry[];
  desired_role?: string;
  experience_level?: string;
  languages?: string | string[];
  certifications?: string | string[];
  industries?: string | string[];
  [key: string]: unknown;
}

export interface JobData {
  id?: string;
  title?: string;
  company?: string;
  companyName?: string;
  location?: string;
  description?: string;
  url?: string;
  match_score?: number;
  salary?: string;
  work_type?: string;
  job_type?: string;
  experience_level?: string;
}

export interface ExtractedKeywords {
  hardSkills: string[];
  softSkills: string[];
  actionVerbs: string[];
  keyPhrases: string[];
  requiredYears: number;
  educationRequirements: string[];
  certifications: string[];
  languages: string[];
  workAuthorization: string[];
  frequency: Record<string, number>;
}

export interface GapAnalysis {
  matchedSkills: string[];
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  experienceMatch: boolean;
  experienceYearsMatch: boolean;
  educationMatch: boolean;
  languageMatch: boolean;
  certificationMatch: boolean;
  overallCompatibility: number;
  suggestedHighlights: string[];
}

export interface ATSResult {
  keywords: ExtractedKeywords;
  gapAnalysis: GapAnalysis;
  cv: string;
  coverLetter: string;
  atsScore: number;
  scoreBreakdown: {
    keywords: number;
    experience: number;
    skills: number;
    education: number;
    format: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
}

const ACTION_VERBS = [
  "manage", "lead", "oversee", "coordinate", "analyze", "conduct", "develop", "implement",
  "drive", "execute", "deliver", "build", "design", "create", "maintain", "monitor",
  "review", "assess", "evaluate", "identify", "resolve", "improve", "increase", "reduce",
  "ensure", "enforce", "advise", "support", "assist", "collaborate", "communicate", "report",
  "investigate", "verify", "validate", "process", "handle", "perform", "prepare", "present",
  "negotiate", "mentor", "train", "supervise", "direct", "control", "audit", "test",
  "deploy", "integrate", "automate", "optimize", "streamline", "standardize", "document",
  "comply", "mitigate", "detect", "prevent", "respond", "escalate", "file", "track",
];

const TECHNICAL_SKILLS = [
  "python", "sql", "javascript", "typescript", "react", "next.js", "node.js", "java",
  "c++", "c#", "go", "rust", "scala", "kotlin", "swift", "php", "ruby", "perl",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "git",
  "ci/cd", "linux", "unix", "bash", "powershell", "mongodb", "postgresql", "mysql",
  "redis", "elasticsearch", "snowflake", "tableau", "power bi", "looker", "excel",
  "salesforce", "hubspot", "sap", "oracle", "workday", "jira", "confluence", "servicenow",
  "kyc", "aml", "cdp", "sar", "fintrac", "ofac", "swift", "sepa", "pci dss",
  "gdpr", "soc 2", "iso 27001", "nist", "hipaa", "sox", "itil", "cobit",
  "risk assessment", "due diligence", "customer onboarding", "transaction monitoring",
  "fraud detection", "compliance monitoring", "regulatory reporting", "internal audit",
  "data analysis", "data modeling", "machine learning", "ai", "nlp", "statistics",
  "r", "matlab", "sas", "spss", "stata", "pandas", "numpy", "scikit-learn",
  "tensorflow", "pytorch", "keras", "spark", "hadoop", "kafka", "airflow",
];

const PROFESSIONAL_SKILLS = [
  "communication", "leadership", "problem solving", "critical thinking", "analytical",
  "detail oriented", "teamwork", "collaboration", "time management", "project management",
  "stakeholder management", "presentation", "negotiation", "decision making", "adaptability",
  "customer service", "relationship management", "mentoring", "coaching", "conflict resolution",
  "multitasking", "prioritization", "organization", "interpersonal", "cross-functional",
];

const CERTIFICATIONS = [
  "cams", "cisa", "cissp", "ceh", "cism", "crisc", "cgeit", "pmp", "prince2",
  "aws certified", "azure certified", "gcp certified", "scrum master", "safe",
  "cisa", "acca", "cima", "cpa", "cfa", "frm", "acca", "cpa", "cma",
  "six sigma", "itil foundation", "lean", "cobit", "iso 27001 lead auditor",
  "ccnp", "ccna", "comptia", "oscp", "gwapt", "gpen", "gsec", "gcih",
];

const DEGREES = [
  "bachelor", "b.s.", "b.a.", "bsc", "ba", "master", "m.s.", "m.a.", "msc", "ma",
  "mba", "phd", "doctorate", "associate degree", "diploma", "certification",
];

const LANGUAGES = [
  "english", "portuguese", "spanish", "french", "german", "italian", "dutch",
  "russian", "chinese", "mandarin", "japanese", "arabic", "hindi", "polish",
  "turkish", "swedish", "danish", "norwegian", "finnish", "greek", "czech",
];

const WORK_AUTH = [
  "work authorization", "work permit", "visa sponsorship", "sponsorship",
  "eu citizenship", "eu passport", "right to work", "legally authorized",
];

function normalizeText(text: string): string {
  return (text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[\r\n]+/g, " ")
    .replace(/[^a-zA-Z0-9\s\/#&+.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function ngrams(tokens: string[], n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(" "));
  }
  return result;
}

function containsIgnoreCase(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase());
}

function findMatches(text: string, dictionary: string[]): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const term of dictionary) {
    if (lower.includes(term.toLowerCase())) {
      found.add(term);
    }
  }
  return Array.from(found);
}

function extractYearsExperience(text: string): number {
  const patterns = [
    /(\d+)\+?\s*(?:-\s*\d+\+?)?\s*years?(?:\s*of\s*experience)?/gi,
    /(?:minimum|min|at least)\s*(\d+)\s*years?/gi,
    /(\d+)\s*years?(?:\s*of)?\s*(?:relevant\s*)?(?:experience|work)/gi,
  ];
  let max = 0;
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const years = parseInt(match[1], 10);
      if (!isNaN(years) && years > max) max = years;
    }
  }
  return max;
}

function extractEducationRequirements(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const deg of DEGREES) {
    if (lower.includes(deg.toLowerCase())) {
      found.push(deg);
    }
  }
  // Deduplicate common aliases
  const unique = new Set(found);
  const result: string[] = [];
  if (unique.has("bachelor") || unique.has("b.s.") || unique.has("b.a.") || unique.has("bsc") || unique.has("ba")) {
    result.push("Bachelor's degree");
  }
  if (unique.has("master") || unique.has("m.s.") || unique.has("m.a.") || unique.has("msc") || unique.has("ma") || unique.has("mba")) {
    result.push("Master's degree");
  }
  if (unique.has("phd") || unique.has("doctorate")) {
    result.push("PhD");
  }
  return result.length > 0 ? result : [];
}

export function extractKeywords(job: JobData): ExtractedKeywords {
  const description = job.description || "";
  const title = job.title || "";
  const fullText = `${title} ${description}`;
  const normalized = normalizeText(fullText).toLowerCase();

  const hardSkills = findMatches(fullText, TECHNICAL_SKILLS);
  const softSkills = findMatches(fullText, PROFESSIONAL_SKILLS);
  const actionVerbs = ACTION_VERBS.filter((v) => normalized.includes(v));
  const certifications = findMatches(fullText, CERTIFICATIONS);
  const languages = findMatches(fullText, LANGUAGES);
  const workAuthorization = findMatches(fullText, WORK_AUTH);
  const educationRequirements = extractEducationRequirements(fullText);
  const requiredYears = extractYearsExperience(fullText);

  // Key phrases: n-grams from title + recurring bigrams/trigrams in description
  const tokens = tokenize(fullText);
  const phraseSet = new Set<string>();
  const frequency: Record<string, number> = {};

  // Add title words as key phrases
  title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
    .forEach((w) => phraseSet.add(w));

  // Extract meaningful n-grams (2-4 words)
  for (const n of [2, 3, 4]) {
    for (const gram of ngrams(tokens, n)) {
      if (/[0-9]/.test(gram)) continue;
      if (gram.split(" ").some((w) => w.length <= 2 && !["kyc", "aml", "ofac", "sar", "cdp", "sepa", "swift", "pci", "gdpr", "soc", "iso", "itil", "cobit", "eu", "us", "uk"].includes(w))) continue;
      frequency[gram] = (frequency[gram] || 0) + 1;
      if (frequency[gram] >= 2 || n <= 2) {
        phraseSet.add(gram);
      }
    }
  }

  // Always include action-verb-led phrases
  for (const verb of actionVerbs.slice(0, 8)) {
    const pattern = new RegExp(`${verb}\\s+([a-z\\s]{3,40}?)(?=\\s+(?:and|or|for|to|in|on|with|as|,|;|\\.))`, "gi");
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(normalized)) !== null) {
      const phrase = `${verb} ${m[1].trim()}`;
      if (phrase.length > 6) phraseSet.add(phrase);
    }
  }

  const keyPhrases = Array.from(phraseSet)
    .filter((p) => p.length > 2)
    .sort((a, b) => (frequency[b] || 0) - (frequency[a] || 0))
    .slice(0, 30);

  return {
    hardSkills,
    softSkills,
    actionVerbs,
    keyPhrases,
    requiredYears,
    educationRequirements,
    certifications,
    languages,
    workAuthorization,
    frequency,
  };
}

function parseProfileSkills(profile: UserProfile): string[] {
  const skills = profile.skills;
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.map((s) => String(s).trim()).filter(Boolean);
  return String(skills)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseProfileLanguages(profile: UserProfile): string[] {
  const langs = profile.languages;
  if (!langs) return [];
  if (Array.isArray(langs)) return langs.map((s) => String(s).trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(langs);
    if (Array.isArray(parsed)) return parsed.map((s: string) => s.trim()).filter(Boolean);
  } catch {}
  return String(langs)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseProfileExperience(profile: UserProfile): ExperienceEntry[] {
  const exp = profile.experience;
  if (!exp) return [];
  if (Array.isArray(exp)) return exp;
  try {
    const parsed = JSON.parse(exp);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function parseProfileEducation(profile: UserProfile): EducationEntry[] {
  const edu = profile.education;
  if (!edu) return [];
  if (Array.isArray(edu)) return edu;
  try {
    const parsed = JSON.parse(edu);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function parseCertifications(profile: UserProfile): string[] {
  const certs = profile.certifications;
  if (!certs) return [];
  if (Array.isArray(certs)) return certs.map((s) => String(s).trim()).filter(Boolean);
  return String(certs)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractYearsFromProfile(profile: UserProfile): number {
  const level = String(profile.experience_level || "").toLowerCase();
  if (level.includes("entry") || level.includes("junior")) return 1;
  if (level.includes("mid")) return 3;
  if (level.includes("senior") || level.includes("lead")) return 6;
  if (level.includes("executive")) return 10;

  // Try to infer from experience durations
  const experiences = parseProfileExperience(profile);
  let total = 0;
  for (const exp of experiences) {
    const duration = exp.duration || "";
    const match = duration.match(/(\d{4})/g);
    if (match && match.length >= 2) {
      const years = parseInt(match[match.length - 1], 10) - parseInt(match[0], 10);
      if (years > 0) total += years;
    }
  }
  return total > 0 ? total : 3;
}

function keywordMatch(jobKw: string[], profileKw: string[]): string[] {
  const profileLower = profileKw.map((k) => k.toLowerCase());
  return jobKw.filter((kw) => {
    const lower = kw.toLowerCase();
    return profileLower.some((p) => p.includes(lower) || lower.includes(p));
  });
}

export function runGapAnalysis(job: JobData, profile: UserProfile): GapAnalysis {
  const keywords = extractKeywords(job);
  const profileSkills = parseProfileSkills(profile);
  const profileLangs = parseProfileLanguages(profile);
  const profileCerts = parseCertifications(profile);
  const profileEdu = parseProfileEducation(profile);
  const profileYears = extractYearsFromProfile(profile);

  const allJobSkills = [...keywords.hardSkills, ...keywords.softSkills];
  const matchedSkills = keywordMatch(allJobSkills, profileSkills);
  const missingRequiredSkills = keywords.hardSkills.filter(
    (k) => !profileSkills.some((s) => s.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(s.toLowerCase()))
  );
  const missingPreferredSkills = keywords.softSkills.filter(
    (k) => !profileSkills.some((s) => s.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(s.toLowerCase()))
  );

  const experienceMatch = profileYears >= Math.max(1, keywords.requiredYears - 1);
  const experienceYearsMatch = keywords.requiredYears === 0 || profileYears >= keywords.requiredYears;

  const educationMatch =
    keywords.educationRequirements.length === 0 ||
    profileEdu.length > 0 ||
    keywords.educationRequirements.some(() => {
      return profileEdu.some((e) => {
        const degree = (e.degree || "").toLowerCase();
        return degree.includes("bachelor") || degree.includes("master") || degree.includes("phd") || degree.includes("degree");
      });
    });

  const languageMatch =
    keywords.languages.length === 0 ||
    keywords.languages.every((lang) =>
      profileLangs.some((pl) => pl.toLowerCase().includes(lang.toLowerCase()) || lang.toLowerCase().includes(pl.toLowerCase()))
    );

  const certificationMatch =
    keywords.certifications.length === 0 ||
    keywords.certifications.some((cert) =>
      profileCerts.some((pc) => pc.toLowerCase().includes(cert.toLowerCase()) || cert.toLowerCase().includes(pc.toLowerCase()))
    );

  // Suggested highlights
  const suggestedHighlights: string[] = [];
  if (matchedSkills.length > 0) {
    suggestedHighlights.push(`Emphasize your ${matchedSkills[0]} experience`);
  }
  if (profileLangs.length > 0 && keywords.languages.length > 0) {
    const shared = profileLangs.find((pl) => keywords.languages.some((kl) => kl.toLowerCase() === pl.toLowerCase()));
    if (shared) suggestedHighlights.push(`Mention your ${shared} language skills`);
  }
  if (profileCerts.length > 0 && keywords.certifications.length > 0) {
    const shared = profileCerts.find((pc) => keywords.certifications.some((kc) => pc.toLowerCase().includes(kc.toLowerCase())));
    if (shared) suggestedHighlights.push(`Highlight your ${shared} certification`);
  }
  if (missingRequiredSkills.length > 0) {
    suggestedHighlights.push(`Address ${missingRequiredSkills[0]} if you have any exposure`);
  }
  if (keywords.requiredYears > 0 && profileYears >= keywords.requiredYears) {
    suggestedHighlights.push(`Highlight ${profileYears} years of relevant experience`);
  }

  // Overall compatibility
  const skillCoverage = allJobSkills.length > 0 ? matchedSkills.length / allJobSkills.length : 1;
  const expPoints = experienceYearsMatch ? 1 : experienceMatch ? 0.7 : 0.3;
  const eduPoints = educationMatch ? 1 : 0.3;
  const langPoints = languageMatch ? 1 : 0.4;
  const certPoints = certificationMatch ? 1 : 0.5;

  const overallCompatibility = Math.round(
    (skillCoverage * 0.45 + expPoints * 0.25 + eduPoints * 0.15 + langPoints * 0.1 + certPoints * 0.05) * 100
  );

  return {
    matchedSkills,
    missingRequiredSkills,
    missingPreferredSkills,
    experienceMatch,
    experienceYearsMatch,
    educationMatch,
    languageMatch,
    certificationMatch,
    overallCompatibility,
    suggestedHighlights,
  };
}

function pickTopKeywords(job: JobData, profile: UserProfile, count: number = 4): string[] {
  const keywords = extractKeywords(job);
  const profileSkills = parseProfileSkills(profile).map((s) => s.toLowerCase());
  const scored = [...keywords.hardSkills, ...keywords.actionVerbs.slice(0, 5)].map((kw) => {
    const lower = kw.toLowerCase();
    const inProfile = profileSkills.some((s) => s.includes(lower) || lower.includes(s));
    const freq = keywords.frequency[lower] || 0;
    return { kw, score: (inProfile ? 10 : 0) + freq };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.kw);
}

function rewriteExperienceBullets(job: JobData, profile: UserProfile): string[] {
  const experiences = parseProfileExperience(profile);
  const keywords = extractKeywords(job);
  const topVerbs = keywords.actionVerbs.slice(0, 6).length > 0 ? keywords.actionVerbs.slice(0, 6) : ["managed", "implemented", "analyzed"];
  const topSkills = keywords.hardSkills.slice(0, 4);

  const bullets: string[] = [];

  for (let i = 0; i < experiences.length; i++) {
    const exp = experiences[i];
    const verb = topVerbs[i % topVerbs.length];
    const skill = topSkills[i % topSkills.length] || "relevant processes";
    const desc = exp.description || "";

    // Extract a quantifiable fragment from description if possible
    const quantMatch = desc.match(/(\d+[+%]?|\$[\d,.]+[kKmM]?|\d+\s*(?:team|people|clients|accounts|documents|transactions)?)/i);
    const quantifier = quantMatch ? quantMatch[1] : "100+";

    const bullet = `${capitalize(verb)} ${skill} initiatives${desc ? " including " + desc.slice(0, 60).toLowerCase() : ""}, supporting ${quantifier} ${i % 2 === 0 ? "operations" : "deliverables"} with measurable accuracy and compliance focus.`;
    bullets.push(bullet);
  }

  // Always add a tailored bullet mirroring a key responsibility
  const keyResp = keywords.keyPhrases.find((p) => p.includes("kyc") || p.includes("aml") || p.includes("compliance") || p.includes("risk") || p.includes("customer"));
  if (keyResp) {
    bullets.unshift(`${capitalize(topVerbs[0])} ${keyResp} processes end-to-end, ensuring adherence to internal policies and external regulatory requirements.`);
  }

  return bullets.length > 0 ? bullets : [`${capitalize(topVerbs[0])} cross-functional initiatives aligned with ${job.title} responsibilities, delivering consistent, high-quality outcomes.`];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function generateCV(job: JobData, profile: UserProfile): string {
  const keywords = extractKeywords(job);
  const gap = runGapAnalysis(job, profile);
  const topSkills = pickTopKeywords(job, profile, 4);
  const experiences = parseProfileExperience(profile);
  const education = parseProfileEducation(profile);
  const profileSkills = parseProfileSkills(profile);
  const profileLangs = parseProfileLanguages(profile);
  const profileCerts = parseCertifications(profile);
  const years = extractYearsFromProfile(profile);

  const title = job.title || "Role";
  const company = job.company || job.companyName || "Company";
  const fullName = profile.full_name || "Candidate";
  const email = profile.email || "";
  const phone = profile.phone || "";
  const location = profile.location || "";
  const linkedin = profile.linkedin || "";

  const bullets = rewriteExperienceBullets(job, profile);

  // Skills section: job-matched first, then transferable
  const jobMatchedSkills = profileSkills
    .filter((s) => [...keywords.hardSkills, ...keywords.softSkills].some((k) => k.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(k.toLowerCase())))
    .slice(0, 12);

  // Ensure 90%+ keyword coverage by injecting missing job keywords naturally
  const coverageSkills = [...jobMatchedSkills];
  for (const kw of keywords.hardSkills) {
    if (!coverageSkills.some((s) => s.toLowerCase().includes(kw.toLowerCase()))) {
      coverageSkills.push(`${kw} (proficient)`);
    }
  }

  const lines: string[] = [];
  lines.push(fullName);
  lines.push([email, phone, location, linkedin].filter(Boolean).join(" | "));
  lines.push("");
  lines.push("PROFESSIONAL SUMMARY");
  lines.push(
    `${title} with ${years} years of experience in ${(profile.industries || "the industry")}. Proven expertise in ${topSkills.join(", ") || "key competencies"} as highlighted in your posting. ${gap.suggestedHighlights[0] || "Dedicated to delivering high-quality results"}. Adept at ${keywords.keyPhrases[0] || "core responsibilities"}. Seeking to leverage ${topSkills[0] || "my strengths"} at ${company}.`
  );
  lines.push("");
  lines.push("EXPERIENCE");
  for (const exp of experiences.slice(0, 4)) {
    lines.push(`${exp.role || "Role"} | ${exp.company || "Company"} | ${exp.duration || ""}`);
    for (const b of bullets.slice(0, 3)) {
      lines.push(`• ${b}`);
    }
    lines.push("");
  }
  if (experiences.length === 0) {
    lines.push(`• ${bullets[0]}`);
    lines.push("");
  }

  lines.push("SKILLS");
  lines.push(coverageSkills.join(" • "));
  lines.push("");

  if (profileCerts.length > 0 || keywords.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    lines.push((profileCerts.length > 0 ? profileCerts : keywords.certifications).join(" • "));
    lines.push("");
  }

  if (education.length > 0) {
    lines.push("EDUCATION");
    for (const edu of education) {
      lines.push(`${edu.degree || "Degree"} - ${edu.school || "Institution"}${edu.year ? `, ${edu.year}` : ""}`);
    }
    lines.push("");
  }

  if (profileLangs.length > 0) {
    lines.push("LANGUAGES");
    lines.push(profileLangs.join(" • "));
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function generateCoverLetter(job: JobData, profile: UserProfile): string {
  const keywords = extractKeywords(job);
  const gap = runGapAnalysis(job, profile);
  const title = job.title || "the position";
  const company = job.company || job.companyName || "your company";
  const fullName = profile.full_name || "Candidate";
  const years = extractYearsFromProfile(profile);
  const experiences = parseProfileExperience(profile);
  const recentExp = experiences[0] || { company: "my previous company", role: "my role" };
  const topSkills = pickTopKeywords(job, profile, 3);

  const topHard = keywords.hardSkills.slice(0, 3);
  const req1 = topHard[0] || topSkills[0] || "core responsibilities";
  const req2 = topHard[1] || topSkills[1] || "team collaboration";
  const skill3 = topHard[2] || topSkills[2] || "industry best practices";

  const quantifier = "30%";
  const achievement = `improved operational efficiency by ${quantifier}`;

  const paragraphs: string[] = [];

  // Paragraph 1 - Hook
  paragraphs.push(
    `I am writing to express my strong interest in the ${title} position at ${company}. As a ${recentExp.role || "professional"} with ${years} years in ${profile.industries || "the field"}, I was excited to see an opportunity aligning with my expertise in ${req1}, ${req2}, and ${skill3}.`
  );

  // Paragraph 2 - Match
  paragraphs.push(
    `Your posting highlights ${req1} and ${req2}. At ${recentExp.company || "my previous company"}, I ${achievement} through hands-on work with ${req1}, resulting in streamlined processes and stronger compliance outcomes. I also have direct experience with ${skill3}, which I used to support ${keywords.keyPhrases[1] || "key deliverables"}. My background in ${profile.industries || "the industry"} prepared me to step into ${keywords.keyPhrases[0] || "the responsibilities outlined"} from day one.`
  );

  // Paragraph 3 - Value add
  paragraphs.push(
    `What draws me to ${company} is the opportunity to contribute to a team focused on ${keywords.keyPhrases[2] || "excellence and growth"}. I am particularly interested in ${company}'s mission because it connects directly with my commitment to ${gap.matchedSkills[0] || "high-impact work"}. My ${gap.matchedSkills[1] || "technical background"} combined with ${years} years of practical experience positions me to advance ${company}'s ${keywords.keyPhrases[3] || "strategic objectives"}.`
  );

  // Paragraph 4 - Close
  paragraphs.push(
    `I would welcome the opportunity to discuss how my experience with ${topSkills[0] || req1} and ${topSkills[1] || req2} can support ${company}'s continued success. Thank you for your consideration.\n\nSincerely,\n${fullName}`
  );

  return paragraphs.join("\n\n");
}

export function calculateATSScore(job: JobData, profile: UserProfile): { score: number; breakdown: ATSResult["scoreBreakdown"]; matched: string[]; missing: string[] } {
  const keywords = extractKeywords(job);
  const gap = runGapAnalysis(job, profile);
  const profileSkills = parseProfileSkills(profile).map((s) => s.toLowerCase());

  // Keyword coverage score (40 pts)
  const allJobKw = [...keywords.hardSkills, ...keywords.softSkills, ...keywords.keyPhrases.slice(0, 10)];
  const matched = allJobKw.filter((kw) =>
    profileSkills.some((s) => s.includes(kw.toLowerCase()) || kw.toLowerCase().includes(s)) ||
    containsIgnoreCase(profile.summary || "", kw)
  );
  const missing = allJobKw.filter((kw) => !matched.includes(kw));
  const keywordCoverage = allJobKw.length > 0 ? matched.length / allJobKw.length : 1;
  const keywordScore = Math.round(keywordCoverage * 40);

  // Experience score (25 pts)
  const years = extractYearsFromProfile(profile);
  const reqYears = keywords.requiredYears;
  let expScore = 20;
  if (reqYears > 0) {
    if (years >= reqYears) expScore = 25;
    else if (years >= reqYears - 1) expScore = 20;
    else if (years >= reqYears - 2) expScore = 12;
    else expScore = 5;
  } else {
    expScore = Math.min(25, 15 + years * 1.5);
  }

  // Skills score (20 pts)
  const hardCoverage = keywords.hardSkills.length > 0 ? gap.matchedSkills.filter((m) => keywords.hardSkills.includes(m)).length / keywords.hardSkills.length : 1;
  const skillsScore = Math.round(Math.min(20, hardCoverage * 20 + 2));

  // Education/cert score (10 pts)
  let eduScore = 8;
  if (keywords.educationRequirements.length > 0 && !gap.educationMatch) eduScore = 3;
  if (keywords.certifications.length > 0 && !gap.certificationMatch) eduScore -= 2;
  if (gap.certificationMatch) eduScore = Math.min(10, eduScore + 2);

  // Format score (5 pts) - always high for our clean output
  const formatScore = 5;

  const total = Math.min(100, keywordScore + expScore + skillsScore + eduScore + formatScore);

  return {
    score: total,
    breakdown: {
      keywords: keywordScore,
      experience: expScore,
      skills: skillsScore,
      education: eduScore,
      format: formatScore,
    },
    matched,
    missing,
  };
}

export function runATSEngine(job: JobData, profile: UserProfile): ATSResult {
  const keywords = extractKeywords(job);
  const gap = runGapAnalysis(job, profile);
  const cv = generateCV(job, profile);
  const coverLetter = generateCoverLetter(job, profile);
  const scoreResult = calculateATSScore(job, profile);

  return {
    keywords,
    gapAnalysis: gap,
    cv,
    coverLetter,
    atsScore: scoreResult.score,
    scoreBreakdown: scoreResult.breakdown,
    matchedKeywords: scoreResult.matched,
    missingKeywords: scoreResult.missing,
  };
}

// Utility: strip company_ prefix from IDs before UUID-expecting API calls
export function cleanJobId(id: string | undefined): string {
  return (id || "").replace(/^company_/, "").replace(/^arbeitnow_/, "").replace(/^adzuna_/, "").replace(/^indeed_/, "");
}

export function isCompanyPrefixedId(id: string | undefined): boolean {
  return !!id && id.startsWith("company_");
}
