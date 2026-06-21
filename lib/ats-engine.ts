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

export interface KeywordCategory {
  technicalSkills: string[];
  softSkills: string[];
  certifications: string[];
  languages: string[];
  educationLevels: string[];
  experienceLevels: string[];
  workTypes: string[];
}

export interface ExtractedKeywords {
  required: KeywordCategory;
  preferred: KeywordCategory;
  allKeywords: string[];
  requiredYears: number;
  frequency: Record<string, number>;
}

export interface GapAnalysis {
  matchedSkills: string[];
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  missingCertifications: string[];
  missingLanguages: string[];
  experienceMatch: boolean;
  experienceYearsMatch: boolean;
  educationMatch: boolean;
  languageMatch: boolean;
  certificationMatch: boolean;
  workTypeMatch: boolean;
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
    technicalSkills: number;
    softSkills: number;
    experience: number;
    languages: number;
    certifications: number;
    education: number;
    workType: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
}

// ============================================================================
// MASTER KEYWORD DICTIONARY
// ============================================================================
const MASTER_KEYWORDS: { required: KeywordCategory; preferred: KeywordCategory } = {
  required: {
    technicalSkills: [
      "KYC", "AML", "Anti-Money Laundering", "Know Your Customer",
      "Fraud Detection", "Fraud Prevention", "Risk Assessment",
      "Risk Management", "Due Diligence", "Customer Due Diligence",
      "Enhanced Due Diligence", "Transaction Monitoring",
      "Suspicious Activity Reports", "SAR Filing", "FinCEN",
      "OFAC", "Sanctions Screening", "PEP Screening",
      "Compliance", "Regulatory Compliance", "Banking Regulations",
      "Financial Crime", "Investigation", "Case Management",
      "Data Analysis", "SQL", "Python", "Excel", "Tableau",
      "Power BI", "Data Visualization", "Statistical Analysis",
      "Machine Learning", "AI", "Artificial Intelligence",
      "Blockchain", "Cryptocurrency", "Smart Contracts",
      "Cloud Computing", "AWS", "Azure", "GCP",
      "Cybersecurity", "Information Security", "Network Security",
      "Penetration Testing", "Vulnerability Assessment",
      "SIEM", "Splunk", "Log Analysis", "Incident Response",
      "DevOps", "CI/CD", "Docker", "Kubernetes", "Terraform",
      "Jenkins", "Git", "GitHub", "GitLab", "Bitbucket",
      "Agile", "Scrum", "Kanban", "Jira", "Confluence",
      "Project Management", "Stakeholder Management",
      "Business Analysis", "Requirements Gathering",
      "Process Improvement", "Six Sigma", "Lean", "Kaizen",
      "CRM", "Salesforce", "HubSpot", "Zendesk",
      "Customer Support", "Technical Support", "Help Desk",
      "ITIL", "ServiceNow", "Incident Management",
      "Quality Assurance", "QA", "Testing", "Test Automation",
      "Selenium", "Cypress", "Jest", "Unit Testing",
      "API Testing", "Performance Testing", "Load Testing",
      "JavaScript", "TypeScript", "React", "Vue", "Angular",
      "Node.js", "Express", "Next.js", "HTML", "CSS",
      "Java", "Spring Boot", "Hibernate", "Maven",
      "Django", "Flask", "FastAPI", "Pandas",
      "C#", ".NET", "ASP.NET", "Entity Framework",
      "Go", "Rust", "Ruby", "Rails", "PHP", "Laravel",
      "Swift", "Kotlin", "Flutter", "React Native",
      "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch",
      "GraphQL", "REST API", "SOAP", "Microservices",
      "Kafka", "RabbitMQ", "Event-Driven Architecture",
    ],
    softSkills: [
      "Communication", "Leadership", "Teamwork", "Problem Solving",
      "Critical Thinking", "Analytical Thinking", "Attention to Detail",
      "Time Management", "Project Management", "Multitasking",
      "Adaptability", "Flexibility", "Creativity", "Innovation",
      "Collaboration", "Interpersonal Skills", "Negotiation",
      "Conflict Resolution", "Decision Making", "Strategic Thinking",
      "Emotional Intelligence", "Customer Service", "Client Relations",
      "Cross-functional Collaboration", "Stakeholder Management",
      "Presentation Skills", "Mentoring", "Coaching",
    ],
    certifications: [
      "CAMS", "ACAMS", "CFCS", "CRCM", "CIA", "CPA", "CISA",
      "CISSP", "CISM", "CEH", "OSCP", "CompTIA Security+",
      "AWS Certified", "Azure Certified", "GCP Certified",
      "PMP", "PRINCE2", "Scrum Master", "CSM", "PSM",
      "ITIL Foundation", "Six Sigma Green Belt", "Six Sigma Black Belt",
      "CFA", "FRM", "CIPP", "CIPM", "CIPT", "ISO 27001",
      "CCNA", "CCNP", "RHCE", "OCP", "CKA", "CKAD",
    ],
    languages: [
      "English", "Portuguese", "Spanish", "French", "German",
      "Dutch", "Italian", "Mandarin", "Japanese", "Korean",
      "Arabic", "Hindi", "Russian", "Polish", "Turkish",
      "Swedish", "Norwegian", "Danish", "Finnish", "Greek",
    ],
    educationLevels: [
      "Bachelor's Degree", "Master's Degree", "PhD", "Doctorate",
      "Associate's Degree", "High School Diploma", "GED",
      "MBA", "JD", "MD", "CPA License",
    ],
    experienceLevels: [
      "Entry Level", "Junior", "Associate", "Mid-Level", "Senior",
      "Lead", "Principal", "Staff", "Manager", "Director",
      "VP", "Head of", "Chief", "C-Level", "Executive",
    ],
    workTypes: [
      "Remote", "On-Site", "Hybrid", "Work From Home", "WFH",
      "Flexible", "Full-Time", "Part-Time", "Contract",
      "Freelance", "Consultant", "Temporary", "Permanent",
    ],
  },
  preferred: {
    technicalSkills: [
      "R", "MATLAB", "SAS", "SPSS", "Stata",
      "Scala", "Julia", "Perl", "Shell Scripting", "Bash",
      "Grafana", "Prometheus", "Datadog", "New Relic",
      "Figma", "Sketch", "Adobe XD", "InVision",
      "Unity", "Unreal Engine", "Blender",
      "TensorFlow", "PyTorch", "Keras", "Scikit-learn",
      "Hadoop", "Spark", "Flink", "Airflow",
      "Elasticsearch", "Kibana", "Logstash", "Beats",
      "Terraform", "Pulumi", "CloudFormation", "Ansible",
      "CircleCI", "Travis CI", "GitHub Actions", "GitLab CI",
      "Nginx", "Apache", "Tomcat", "IIS",
      "Redis", "Memcached", "Cassandra", "DynamoDB",
      "Snowflake", "BigQuery", "Redshift", "Databricks",
    ],
    softSkills: [
      "Public Speaking", "Writing", "Research", "Self-Motivation",
      "Initiative", "Ownership", "Accountability", "Resilience",
      "Patience", "Empathy", "Persuasion", "Influence",
      "Networking", "Relationship Building", "Team Building",
    ],
    certifications: [
      "Google Analytics", "HubSpot Inbound", "Salesforce Administrator",
      "AWS Solutions Architect", "AWS Developer", "Azure Administrator",
      "Google Cloud Professional", "Kubernetes Administrator",
      "Certified Ethical Hacker", "Offensive Security",
    ],
    languages: [
      "Czech", "Hungarian", "Romanian", "Bulgarian", "Croatian",
      "Serbian", "Ukrainian", "Vietnamese", "Thai", "Indonesian",
      "Malay", "Hebrew", "Bengali", "Tamil", "Urdu",
    ],
    educationLevels: [
      "Professional Certificate", "Diploma", "Bootcamp",
    ],
    experienceLevels: [
      "Internship", "Trainee", "Apprentice",
    ],
    workTypes: [
      "Internship", "Seasonal", "Volunteer",
    ],
  },
};

// Words/phrases that should never be treated as keywords or gaps
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can",
  "this", "that", "these", "those", "we", "you", "they", "it", "he", "she", "i", "me",
  "us", "them", "his", "her", "its", "our", "your", "their", "what", "which", "who", "when",
  "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "now", "then", "here", "there", "up", "down", "out", "off", "over", "under", "again",
  "further", "once", "about", "before", "after", "above", "below", "between", "into",
  "through", "during", "before", "after", "join", "looking", "seeking", "apply", "application",
  "role", "position", "job", "work", "company", "team", "opportunity", "candidate", "applicant",
]);

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

function detectExperienceLevel(text: string): string | null {
  const lower = text.toLowerCase();
  const levels = [
    { term: "entry level", label: "Entry Level" },
    { term: "junior", label: "Junior" },
    { term: "associate", label: "Associate" },
    { term: "mid-level", label: "Mid-Level" },
    { term: "mid level", label: "Mid-Level" },
    { term: "senior", label: "Senior" },
    { term: "lead", label: "Lead" },
    { term: "principal", label: "Principal" },
    { term: "staff", label: "Staff" },
    { term: "manager", label: "Manager" },
    { term: "director", label: "Director" },
    { term: "vp", label: "VP" },
    { term: "head of", label: "Head of" },
    { term: "chief", label: "Chief" },
    { term: "c-level", label: "C-Level" },
    { term: "executive", label: "Executive" },
  ];
  for (const level of levels) {
    if (lower.includes(level.term)) return level.label;
  }
  return null;
}

function detectEducationLevel(text: string): string | null {
  const lower = text.toLowerCase();
  const levels = [
    { term: "phd", label: "PhD" },
    { term: "doctorate", label: "Doctorate" },
    { term: "master's degree", label: "Master's Degree" },
    { term: "master degree", label: "Master's Degree" },
    { term: "mba", label: "MBA" },
    { term: "bachelor's degree", label: "Bachelor's Degree" },
    { term: "bachelor degree", label: "Bachelor's Degree" },
    { term: "associate's degree", label: "Associate's Degree" },
    { term: "associate degree", label: "Associate's Degree" },
    { term: "high school diploma", label: "High School Diploma" },
    { term: "ged", label: "GED" },
  ];
  for (const level of levels) {
    if (lower.includes(level.term)) return level.label;
  }
  return null;
}

function detectWorkType(text: string): string | null {
  const lower = text.toLowerCase();
  const types = [
    { term: "remote", label: "Remote" },
    { term: "work from home", label: "Work From Home" },
    { term: "wfh", label: "WFH" },
    { term: "hybrid", label: "Hybrid" },
    { term: "on-site", label: "On-Site" },
    { term: "onsite", label: "On-Site" },
    { term: "full-time", label: "Full-Time" },
    { term: "full time", label: "Full-Time" },
    { term: "part-time", label: "Part-Time" },
    { term: "part time", label: "Part-Time" },
    { term: "contract", label: "Contract" },
    { term: "freelance", label: "Freelance" },
    { term: "temporary", label: "Temporary" },
    { term: "permanent", label: "Permanent" },
  ];
  for (const type of types) {
    if (lower.includes(type.term)) return type.label;
  }
  return null;
}

function identifyRequirementsSections(text: string): { required: string; preferred: string } {
  const lower = text.toLowerCase();
  const requiredMarkers = ["requirements:", "required:", "must have:", "must-have:", "qualifications:", "what you need:", "we are looking for:"];
  const preferredMarkers = ["preferred:", "nice to have:", "nice-to-have:", "desired:", "bonus:", "plus:", "beneficial:"];

  let requiredStart = -1;
  let preferredStart = -1;

  for (const marker of requiredMarkers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (requiredStart === -1 || idx < requiredStart)) requiredStart = idx;
  }

  for (const marker of preferredMarkers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (preferredStart === -1 || idx < preferredStart)) preferredStart = idx;
  }

  if (requiredStart === -1 && preferredStart === -1) {
    return { required: text, preferred: "" };
  }

  // If preferred comes before required, swap interpretation
  if (preferredStart !== -1 && requiredStart !== -1 && preferredStart < requiredStart) {
    return {
      required: text.slice(requiredStart),
      preferred: text.slice(preferredStart, requiredStart),
    };
  }

  if (requiredStart !== -1 && preferredStart !== -1) {
    return {
      required: text.slice(requiredStart, preferredStart),
      preferred: text.slice(preferredStart),
    };
  }

  if (requiredStart !== -1) return { required: text.slice(requiredStart), preferred: "" };
  return { required: text, preferred: text.slice(preferredStart) };
}

export function extractKeywords(job: JobData): ExtractedKeywords {
  const description = job.description || "";
  const title = job.title || "";
  const fullText = `${title} ${description}`;
  const normalized = normalizeText(fullText);
  const lower = normalized.toLowerCase();

  const { required: requiredSection, preferred: preferredSection } = identifyRequirementsSections(fullText);

  const required: KeywordCategory = {
    technicalSkills: findMatches(requiredSection || fullText, MASTER_KEYWORDS.required.technicalSkills),
    softSkills: findMatches(requiredSection || fullText, MASTER_KEYWORDS.required.softSkills),
    certifications: findMatches(requiredSection || fullText, MASTER_KEYWORDS.required.certifications),
    languages: findMatches(requiredSection || fullText, MASTER_KEYWORDS.required.languages),
    educationLevels: detectEducationLevel(requiredSection || fullText) ? [detectEducationLevel(requiredSection || fullText)!] : [],
    experienceLevels: detectExperienceLevel(requiredSection || fullText) ? [detectExperienceLevel(requiredSection || fullText)!] : [],
    workTypes: detectWorkType(fullText) ? [detectWorkType(fullText)!] : [],
  };

  const preferred: KeywordCategory = {
    technicalSkills: findMatches(preferredSection || fullText, MASTER_KEYWORDS.preferred.technicalSkills),
    softSkills: findMatches(preferredSection || fullText, MASTER_KEYWORDS.preferred.softSkills),
    certifications: findMatches(preferredSection || fullText, MASTER_KEYWORDS.preferred.certifications),
    languages: findMatches(preferredSection || fullText, MASTER_KEYWORDS.preferred.languages),
    educationLevels: detectEducationLevel(preferredSection) ? [detectEducationLevel(preferredSection)!] : [],
    experienceLevels: detectExperienceLevel(preferredSection) ? [detectExperienceLevel(preferredSection)!] : [],
    workTypes: detectWorkType(preferredSection) ? [detectWorkType(preferredSection)!] : [],
  };

  // Remove preferred items that are already in required
  for (const key of Object.keys(preferred) as Array<keyof KeywordCategory>) {
    preferred[key] = preferred[key].filter((p) => !required[key].some((r) => r.toLowerCase() === p.toLowerCase()));
  }

  const allKeywords = [
    ...required.technicalSkills,
    ...required.softSkills,
    ...required.certifications,
    ...required.languages,
    ...preferred.technicalSkills,
    ...preferred.softSkills,
    ...preferred.certifications,
    ...preferred.languages,
  ];

  // Build frequency map for matched terms
  const frequency: Record<string, number> = {};
  for (const kw of allKeywords) {
    const pattern = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = normalized.match(pattern);
    frequency[kw] = matches ? matches.length : 0;
  }

  return {
    required,
    preferred,
    allKeywords,
    requiredYears: extractYearsExperience(fullText),
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

function profileExperienceLevel(profile: UserProfile): string | null {
  const level = String(profile.experience_level || "").toLowerCase();
  if (level.includes("entry") || level.includes("junior")) return "Entry Level";
  if (level.includes("mid")) return "Mid-Level";
  if (level.includes("senior") || level.includes("lead")) return "Senior";
  if (level.includes("executive") || level.includes("director") || level.includes("manager")) return "Manager";
  return null;
}

function profileEducationLevel(profile: UserProfile): string | null {
  const education = parseProfileEducation(profile);
  if (education.length === 0) return null;
  const degree = (education[0].degree || "").toLowerCase();
  if (degree.includes("phd") || degree.includes("doctorate")) return "PhD";
  if (degree.includes("master") || degree.includes("mba")) return "Master's Degree";
  if (degree.includes("bachelor")) return "Bachelor's Degree";
  if (degree.includes("associate")) return "Associate's Degree";
  return "Bachelor's Degree";
}

function keywordMatch(jobKw: string[], profileKw: string[]): string[] {
  const profileLower = profileKw.map((k) => k.toLowerCase());
  return jobKw.filter((kw) => {
    const lower = kw.toLowerCase();
    return profileLower.some((p) => p.includes(lower) || lower.includes(p));
  });
}

function calculateCategoryScore(matched: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((matched / total) * 100);
}

export function runGapAnalysis(job: JobData, profile: UserProfile): GapAnalysis {
  const keywords = extractKeywords(job);
  const profileSkills = parseProfileSkills(profile);
  const profileLangs = parseProfileLanguages(profile);
  const profileCerts = parseCertifications(profile);
  const profileEdu = profileEducationLevel(profile);
  const profileExp = profileExperienceLevel(profile);
  const profileYears = extractYearsFromProfile(profile);

  const requiredSkills = keywords.required.technicalSkills;
  const preferredSkills = keywords.preferred.technicalSkills;
  const requiredSoft = keywords.required.softSkills;
  const preferredSoft = keywords.preferred.softSkills;

  const matchedSkills = [
    ...keywordMatch(requiredSkills, profileSkills),
    ...keywordMatch(requiredSoft, profileSkills),
    ...keywordMatch(preferredSkills, profileSkills),
    ...keywordMatch(preferredSoft, profileSkills),
  ];

  const missingRequiredSkills = requiredSkills.filter(
    (k) => !profileSkills.some((s) => s.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(s.toLowerCase()))
  );

  const missingPreferredSkills = preferredSkills.filter(
    (k) => !profileSkills.some((s) => s.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(s.toLowerCase()))
  );

  const missingCertifications = keywords.required.certifications.filter(
    (k) => !profileCerts.some((s) => s.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(s.toLowerCase()))
  );

  const missingLanguages = keywords.required.languages.filter(
    (lang) => !profileLangs.some((pl) => pl.toLowerCase().includes(lang.toLowerCase()) || lang.toLowerCase().includes(pl.toLowerCase()))
  );

  const experienceMatch = profileYears >= Math.max(1, keywords.requiredYears - 1);
  const experienceYearsMatch = keywords.requiredYears === 0 || profileYears >= keywords.requiredYears;

  const jobExpLevel = keywords.required.experienceLevels[0];
  const experienceLevelMatch = !jobExpLevel || !profileExp || jobExpLevel.toLowerCase() === profileExp.toLowerCase();

  const educationMatch =
    keywords.required.educationLevels.length === 0 ||
    !profileEdu ||
    keywords.required.educationLevels.some((req) => {
      const reqLower = req.toLowerCase();
      if (reqLower.includes("phd")) return profileEdu === "PhD";
      if (reqLower.includes("master")) return ["PhD", "Master's Degree"].includes(profileEdu);
      if (reqLower.includes("bachelor")) return ["PhD", "Master's Degree", "Bachelor's Degree"].includes(profileEdu);
      return true;
    });

  const languageMatch = missingLanguages.length === 0;
  const certificationMatch = missingCertifications.length === 0;

  const jobWorkType = keywords.required.workTypes[0] || keywords.preferred.workTypes[0];
  const profileWorkType = String(profile.work_type || "Remote");
  const workTypeMatch =
    !jobWorkType ||
    jobWorkType.toLowerCase() === profileWorkType.toLowerCase() ||
    (jobWorkType.toLowerCase().includes("remote") && profileWorkType.toLowerCase().includes("remote")) ||
    (jobWorkType.toLowerCase().includes("hybrid") && profileWorkType.toLowerCase().includes("hybrid")) ||
    (jobWorkType.toLowerCase().includes("on-site") && profileWorkType.toLowerCase().includes("onsite"));

  const suggestedHighlights: string[] = [];
  if (matchedSkills.length > 0) {
    suggestedHighlights.push(`Emphasize your ${matchedSkills[0]} experience`);
  }
  if (profileLangs.length > 0 && keywords.required.languages.length > 0) {
    const shared = profileLangs.find((pl) => keywords.required.languages.some((kl) => kl.toLowerCase() === pl.toLowerCase()));
    if (shared) suggestedHighlights.push(`Mention your ${shared} language skills`);
  }
  if (profileCerts.length > 0 && keywords.required.certifications.length > 0) {
    const shared = profileCerts.find((pc) => keywords.required.certifications.some((kc) => pc.toLowerCase().includes(kc.toLowerCase())));
    if (shared) suggestedHighlights.push(`Highlight your ${shared} certification`);
  }
  if (missingRequiredSkills.length > 0) {
    suggestedHighlights.push(`Address ${missingRequiredSkills[0]} if you have any exposure`);
  }
  if (keywords.requiredYears > 0 && profileYears >= keywords.requiredYears) {
    suggestedHighlights.push(`Highlight ${profileYears} years of relevant experience`);
  }

  // Compatibility for display (not the main score)
  const skillCoverage = requiredSkills.length > 0 ? (requiredSkills.length - missingRequiredSkills.length) / requiredSkills.length : 1;
  const expPoints = experienceYearsMatch ? 1 : experienceMatch ? 0.7 : 0.3;
  const eduPoints = educationMatch ? 1 : 0.3;
  const langPoints = languageMatch ? 1 : 0.4;
  const certPoints = certificationMatch ? 1 : 0.5;
  const wtPoints = workTypeMatch ? 1 : 0.5;

  const overallCompatibility = Math.round(
    (skillCoverage * 0.35 + expPoints * 0.2 + eduPoints * 0.15 + langPoints * 0.1 + certPoints * 0.1 + wtPoints * 0.1) * 100
  );

  return {
    matchedSkills,
    missingRequiredSkills,
    missingPreferredSkills,
    missingCertifications,
    missingLanguages,
    experienceMatch,
    experienceYearsMatch,
    educationMatch,
    languageMatch,
    certificationMatch,
    workTypeMatch,
    overallCompatibility,
    suggestedHighlights,
  };
}

function pickTopKeywords(job: JobData, profile: UserProfile, count: number = 4): string[] {
  const keywords = extractKeywords(job);
  const profileSkills = parseProfileSkills(profile).map((s) => s.toLowerCase());
  const scored = [
    ...keywords.required.technicalSkills,
    ...keywords.required.softSkills,
  ].map((kw) => {
    const lower = kw.toLowerCase();
    const inProfile = profileSkills.some((s) => s.includes(lower) || lower.includes(s));
    const freq = keywords.frequency[kw] || 0;
    return { kw, score: (inProfile ? 10 : 0) + freq };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.kw);
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

function extractActionVerbs(text: string): string[] {
  const lower = text.toLowerCase();
  return ACTION_VERBS.filter((v) => lower.includes(v));
}

function rewriteExperienceBullets(job: JobData, profile: UserProfile): string[] {
  const experiences = parseProfileExperience(profile);
  const keywords = extractKeywords(job);
  const actionVerbs = extractActionVerbs(`${job.title} ${job.description}`);
  const topVerbs = actionVerbs.slice(0, 6).length > 0 ? actionVerbs.slice(0, 6) : ["managed", "implemented", "analyzed"];
  const topSkills = keywords.required.technicalSkills.slice(0, 4);

  const bullets: string[] = [];

  for (let i = 0; i < experiences.length; i++) {
    const exp = experiences[i];
    const verb = topVerbs[i % topVerbs.length];
    const skill = topSkills[i % topSkills.length] || "relevant processes";
    const desc = exp.description || "";
    const quantMatch = desc.match(/(\d+[+%]?|\$[\d,.]+[kKmM]?|\d+\s*(?:team|people|clients|accounts|documents|transactions)?)/i);
    const quantifier = quantMatch ? quantMatch[1] : "100+";

    const bullet = `${capitalize(verb)} ${skill} initiatives${desc ? " including " + desc.slice(0, 60).toLowerCase() : ""}, supporting ${quantifier} ${i % 2 === 0 ? "operations" : "deliverables"} with measurable accuracy and compliance focus.`;
    bullets.push(bullet);
  }

  const keyResp = keywords.required.technicalSkills.find((p) =>
    /\b(kyc|aml|compliance|risk|customer|fraud|transaction|due diligence)\b/i.test(p)
  );
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

  const jobMatchedSkills = profileSkills
    .filter((s) =>
      [...keywords.required.technicalSkills, ...keywords.required.softSkills].some(
        (k) => k.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(k.toLowerCase())
      )
    )
    .slice(0, 12);

  const coverageSkills = [...jobMatchedSkills];
  for (const kw of keywords.required.technicalSkills) {
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
    `${title} with ${years} years of experience in ${(profile.industries || "the industry")}. Proven expertise in ${topSkills.join(", ") || "key competencies"} as highlighted in your posting. ${gap.suggestedHighlights[0] || "Dedicated to delivering high-quality results"}. Adept at ${keywords.required.technicalSkills[0] || "core responsibilities"}. Seeking to leverage ${topSkills[0] || "my strengths"} at ${company}.`
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

  if (profileCerts.length > 0 || keywords.required.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    lines.push((profileCerts.length > 0 ? profileCerts : keywords.required.certifications).join(" • "));
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

  const topHard = keywords.required.technicalSkills.slice(0, 3);
  const req1 = topHard[0] || topSkills[0] || "core responsibilities";
  const req2 = topHard[1] || topSkills[1] || "team collaboration";
  const skill3 = topHard[2] || topSkills[2] || "industry best practices";

  const quantifier = "30%";
  const achievement = `improved operational efficiency by ${quantifier}`;

  const paragraphs: string[] = [];

  paragraphs.push(
    `I am writing to express my strong interest in the ${title} position at ${company}. As a ${recentExp.role || "professional"} with ${years} years in ${profile.industries || "the field"}, I was excited to see an opportunity aligning with my expertise in ${req1}, ${req2}, and ${skill3}.`
  );

  paragraphs.push(
    `Your posting highlights ${req1} and ${req2}. At ${recentExp.company || "my previous company"}, I ${achievement} through hands-on work with ${req1}, resulting in streamlined processes and stronger compliance outcomes. I also have direct experience with ${skill3}, which I used to support ${keywords.required.technicalSkills[1] || "key deliverables"}. My background in ${profile.industries || "the industry"} prepared me to step into ${keywords.required.technicalSkills[0] || "the responsibilities outlined"} from day one.`
  );

  paragraphs.push(
    `What draws me to ${company} is the opportunity to contribute to a team focused on ${keywords.required.technicalSkills[2] || "excellence and growth"}. I am particularly interested in ${company}'s mission because it connects directly with my commitment to ${gap.matchedSkills[0] || "high-impact work"}. My ${gap.matchedSkills[1] || "technical background"} combined with ${years} years of practical experience positions me to advance ${company}'s ${keywords.required.softSkills[0] || "strategic objectives"}.`
  );

  paragraphs.push(
    `I would welcome the opportunity to discuss how my experience with ${topSkills[0] || req1} and ${topSkills[1] || req2} can support ${company}'s continued success. Thank you for your consideration.\n\nSincerely,\n${fullName}`
  );

  return paragraphs.join("\n\n");
}

export function calculateATSScore(
  job: JobData,
  profile: UserProfile,
  discoverScore?: number
): { score: number; breakdown: ATSResult["scoreBreakdown"]; matched: string[]; missing: string[] } {
  const keywords = extractKeywords(job);
  const gap = runGapAnalysis(job, profile);
  const profileSkills = parseProfileSkills(profile).map((s) => s.toLowerCase());
  const profileLangs = parseProfileLanguages(profile).map((s) => s.toLowerCase());
  const profileCerts = parseCertifications(profile).map((s) => s.toLowerCase());

  const requiredAll = [
    ...keywords.required.technicalSkills,
    ...keywords.required.softSkills,
  ];

  const matched = requiredAll.filter((kw) =>
    profileSkills.some((s) => s.includes(kw.toLowerCase()) || kw.toLowerCase().includes(s)) ||
    containsIgnoreCase(profile.summary || "", kw)
  );

  const missing = requiredAll.filter((kw) => !matched.includes(kw));

  // Detailed breakdown for display
  const technicalScore = calculateCategoryScore(
    gap.matchedSkills.filter((m) => keywords.required.technicalSkills.includes(m)).length,
    keywords.required.technicalSkills.length
  );

  const softScore = calculateCategoryScore(
    gap.matchedSkills.filter((m) => keywords.required.softSkills.includes(m)).length,
    keywords.required.softSkills.length
  );

  const years = extractYearsFromProfile(profile);
  const reqYears = keywords.requiredYears;
  let expScore = 70;
  if (reqYears > 0) {
    if (years >= reqYears) expScore = 100;
    else if (years >= reqYears - 1) expScore = 80;
    else if (years >= reqYears - 2) expScore = 50;
    else expScore = 20;
  } else {
    expScore = Math.min(100, 60 + years * 5);
  }

  const langScore = calculateCategoryScore(
    keywords.required.languages.length - gap.missingLanguages.length,
    keywords.required.languages.length
  );

  const certScore = calculateCategoryScore(
    keywords.required.certifications.length - gap.missingCertifications.length,
    keywords.required.certifications.length
  );

  const eduScore = gap.educationMatch ? 100 : 40;
  const workTypeScore = gap.workTypeMatch ? 100 : 50;

  // Main score: prioritize Discover score if provided, otherwise weighted calculation
  let finalScore: number;
  if (discoverScore !== undefined && discoverScore > 0) {
    finalScore = Math.round(discoverScore);
  } else {
    finalScore = Math.round(
      technicalScore * 0.30 +
      softScore * 0.15 +
      expScore * 0.20 +
      langScore * 0.10 +
      certScore * 0.10 +
      eduScore * 0.10 +
      workTypeScore * 0.05
    );
  }

  return {
    score: Math.min(100, finalScore),
    breakdown: {
      technicalSkills: technicalScore,
      softSkills: softScore,
      experience: expScore,
      languages: langScore,
      certifications: certScore,
      education: eduScore,
      workType: workTypeScore,
    },
    matched,
    missing,
  };
}

export function runATSEngine(job: JobData, profile: UserProfile, discoverScore?: number): ATSResult {
  const keywords = extractKeywords(job);
  const gap = runGapAnalysis(job, profile);
  const cv = generateCV(job, profile);
  const coverLetter = generateCoverLetter(job, profile);
  const scoreResult = calculateATSScore(job, profile, discoverScore);

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
