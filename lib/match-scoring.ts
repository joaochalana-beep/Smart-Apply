// lib/match-scoring.ts
// Standalone match scoring utility — mirrors the weighted algorithm in
// app/api/discover/route.ts so scoring stays consistent across the app.

export interface Job {
  id: string;
  company: string;
  role: string;
  description?: string;
  url: string;
  location?: string | null;
  work_type?: string;
  job_type?: string;
  experience_level?: string | null;
  salary?: string | number | null;
  sector?: string;
  source?: string;
  match_score?: number;
  [key: string]: any;
}

export interface Profile {
  desired_role?: string;
  desired_location?: string;
  work_type?: string;
  experience_level?: string;
  job_type?: string;
  desired_salary_min?: number | string;
  desired_salary_max?: number | string;
  industries?: string | string[];
  languages?: string[];
  [key: string]: any;
}

const CITY_TO_COUNTRY: Record<string, string> = {
  lisbon: "portugal", porto: "portugal", lisboa: "portugal",
  braga: "portugal", coimbra: "portugal", faro: "portugal",
  aveiro: "portugal", setubal: "portugal", leiria: "portugal", funchal: "portugal",
  dublin: "ireland", cork: "ireland", galway: "ireland", limerick: "ireland", waterford: "ireland",
  madrid: "spain", barcelona: "spain", valencia: "spain",
  rome: "italy", milan: "italy", milano: "italy", turin: "italy", torino: "italy",
  naples: "italy", napoli: "italy",
  berlin: "germany", munich: "germany", munchen: "germany", hamburg: "germany",
  cologne: "germany", koln: "germany", frankfurt: "germany", stuttgart: "germany",
  paris: "france", lyon: "france", marseille: "france",
  amsterdam: "netherlands", rotterdam: "netherlands",
  brussels: "belgium",
  vienna: "austria", wien: "austria",
  zurich: "switzerland", geneva: "switzerland",
  warsaw: "poland",
  stockholm: "sweden",
  copenhagen: "denmark",
  oslo: "norway",
  helsinki: "finland",
  london: "uk", manchester: "uk", birmingham: "uk",
};

const EU_COUNTRIES = [
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic", "czechia",
  "denmark", "estonia", "finland", "france", "germany", "greece", "hungary", "ireland",
  "italy", "latvia", "lithuania", "luxembourg", "malta", "netherlands", "poland",
  "portugal", "romania", "slovakia", "slovenia", "spain", "sweden",
  "uk", "united kingdom", "great britain", "england", "scotland", "wales",
  "switzerland", "norway", "iceland",
];

function expandRoleTerms(role: string): string[] {
  const terms = new Set<string>();
  const lower = role.toLowerCase().trim();
  if (lower.length < 2) return [];

  terms.add(lower);

  const keywordForm = lower
    .replace(/\b(analyst|specialist|officer|manager|engineer|developer|representative|coordinator|associate)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (keywordForm && keywordForm !== lower && keywordForm.length >= 2) {
    terms.add(keywordForm);
  }

  if (/\bengineer\b/.test(lower)) terms.add(lower.replace(/\bengineer\b/g, "developer"));
  if (/\bdeveloper\b/.test(lower)) terms.add(lower.replace(/\bdeveloper\b/g, "engineer"));

  if (lower.includes("customer support") || lower.includes("technical support")) {
    terms.add("support");
    terms.add("customer service");
  }
  if (lower.includes("support")) terms.add("customer support");

  if (lower.includes("trust") || lower.includes("safety")) {
    terms.add("trust & safety");
    terms.add("trust and safety");
    terms.add("content moderator");
    terms.add("content moderation");
    terms.add("safety");
  }

  if (lower.includes("risk")) {
    terms.add("risk analyst");
    terms.add("risk specialist");
    terms.add("risk manager");
  }

  if (lower.includes("compliance")) {
    terms.add("compliance");
    terms.add("regulatory");
    terms.add("compliance analyst");
  }

  if (lower.includes("kyc")) {
    terms.add("kyc");
    terms.add("know your customer");
    terms.add("kyc analyst");
    terms.add("kyc specialist");
  }

  if (lower.includes("aml")) {
    terms.add("aml");
    terms.add("anti money laundering");
    terms.add("aml analyst");
  }

  if (lower.includes("fraud")) {
    terms.add("fraud");
    terms.add("fraud analyst");
    terms.add("risk");
  }

  if (/\bmanager\b/.test(lower)) terms.add(lower.replace(/\bmanager\b/g, "management"));
  if (/\bqa\b/.test(lower)) terms.add(lower.replace(/\bqa\b/g, "quality assurance"));
  if (lower.includes("implementation")) {
    terms.add("implementation");
    terms.add("project");
  }

  return Array.from(terms);
}

function getSearchTerms(profile: Profile): string[] {
  const roles = (profile.desired_role || "")
    .split(/[;,]/)
    .map((r: string) => r.trim())
    .filter(Boolean);
  return roles.length > 0 ? roles : ["software engineer"];
}

function scoreRoleMatch(title: string, description: string, desiredRoles: string[]): number {
  const titleLower = title.toLowerCase();
  const descLower = (description || "").toLowerCase();
  let bestScore = 0;

  for (const role of desiredRoles) {
    for (const term of expandRoleTerms(role)) {
      const t = term.toLowerCase().trim();
      if (t.length < 2) continue;

      if (titleLower.includes(t)) {
        bestScore = Math.max(bestScore, 1.0);
        continue;
      }

      const words = t.split(/\s+/).filter((w) => w.length >= 3);
      if (words.length > 0) {
        const matched = words.filter((w) => titleLower.includes(w)).length;
        if (matched === words.length) bestScore = Math.max(bestScore, 0.85);
        else if (matched >= 2) bestScore = Math.max(bestScore, 0.55 + (matched / words.length) * 0.2);
        else if (matched === 1) bestScore = Math.max(bestScore, 0.35);
      }

      if (descLower.includes(t)) bestScore = Math.max(bestScore, 0.55);
      else if (words.length > 0) {
        const descMatched = words.filter((w) => descLower.includes(w)).length;
        if (descMatched >= 2) bestScore = Math.max(bestScore, 0.35);
        else if (descMatched === 1) bestScore = Math.max(bestScore, 0.2);
      }
    }
  }

  return bestScore;
}

function detectWorkType(job: Job): "remote" | "hybrid" | "onsite" | "unknown" {
  const text = `${job.role || ""} ${job.description || ""} ${job.location || ""} ${job.work_type || ""}`.toLowerCase();
  if (text.includes("remote") || text.includes("work from home") || text.includes("wfh") || text.includes("home office") || text.includes("anywhere")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("on-site") || text.includes("onsite") || text.includes("in office") || text.includes("in-office") || text.includes("on site")) return "onsite";
  return "unknown";
}

function scoreWorkType(job: Job, userWorkType: string): number {
  const jobWT = detectWorkType(job);
  const userWT = (userWorkType || "").toLowerCase();

  if (!userWT || userWT === "any") return jobWT === "unknown" ? 0.75 : 0.85;

  if (userWT.includes("remote")) {
    if (jobWT === "remote") return 1.0;
    if (jobWT === "hybrid") return 0.6;
    if (jobWT === "onsite") return 0.0;
    return 0.5;
  }

  if (userWT.includes("hybrid")) {
    if (jobWT === "hybrid") return 1.0;
    if (jobWT === "remote") return 0.7;
    if (jobWT === "onsite") return 0.3;
    return 0.65;
  }

  if (userWT.includes("on-site") || userWT.includes("onsite")) {
    if (jobWT === "onsite") return 1.0;
    if (jobWT === "hybrid") return 0.6;
    if (jobWT === "remote") return 0.1;
    return 0.65;
  }

  return 0.75;
}

function scoreLocation(jobLoc: string, desiredLoc: string): number {
  if (!desiredLoc || !jobLoc) return 0.75;

  const jobLower = jobLoc.toLowerCase();
  const desiredLower = desiredLoc.toLowerCase();
  const desiredLocs = desiredLower.split(/[,;\s]+/).filter((s) => s.length > 2);
  const userWantsRemote = desiredLower.includes("remote") || desiredLower.includes("anywhere") || desiredLower.includes("global");

  for (const loc of desiredLocs) {
    if (jobLower.includes(loc)) return 1.0;
    const cityCountry = CITY_TO_COUNTRY[loc];
    if (cityCountry && jobLower.includes(cityCountry)) return 1.0;
    for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
      if (jobLower.includes(city) && (loc === country || country.includes(loc))) return 1.0;
    }
  }

  if (desiredLower.includes("europe") || desiredLower.includes("eu") || desiredLower.includes("emea")) {
    if (EU_COUNTRIES.some((c) => jobLower.includes(c))) return 0.8;
  }

  if (userWantsRemote && (jobLower.includes("remote") || jobLower.includes("anywhere") || jobLower.includes("global"))) {
    return 0.9;
  }

  return 0.0;
}

function scoreExperienceLevel(title: string, description: string, userLevel: string): number {
  const text = `${title} ${description || ""}`.toLowerCase();
  const userLevelLower = (userLevel || "").toLowerCase().trim();

  if (!userLevelLower || userLevelLower === "any") return 0.75;

  const hasSenior = /\b(senior|sr\.?|lead|principal|staff|head of|director|vp|vice president|chief|architect|5\+ years|6\+ years|7\+ years|8\+ years|10\+ years)\b/i.test(text);
  const hasMid = /\b(mid|mid-level|intermediate|2-5 years|3\+ years|4\+ years|level 2|level ii)\b/i.test(text);
  const hasEntry = /\b(entry|entry-level|junior|jr\.?|graduate|grad|intern|trainee|0-2|1-2|1\+ years|no experience|early career|fresh|associate i?)\b/i.test(text);

  if (userLevelLower.includes("entry") || userLevelLower.includes("junior") || userLevelLower.includes("grad")) {
    if (hasEntry) return 1.0;
    if (hasMid) return 0.3;
    if (hasSenior) return 0.0;
    return 0.7;
  }

  if (userLevelLower.includes("mid") || userLevelLower.includes("intermediate")) {
    if (hasMid) return 1.0;
    if (hasSenior) return 0.6;
    if (hasEntry) return 0.5;
    return 0.75;
  }

  if (userLevelLower.includes("senior") || userLevelLower.includes("lead") || userLevelLower.includes("principal")) {
    if (hasSenior) return 1.0;
    if (hasMid) return 0.7;
    if (hasEntry) return 0.2;
    return 0.75;
  }

  return 0.75;
}

function parseSalaryToMonthly(salary: string | number): { min: number; max: number } | null {
  if (!salary || String(salary).toLowerCase().includes("not specified") || String(salary).toLowerCase().includes("competitive")) return null;

  const str = String(salary);
  const matches = str.match(/\d[\d\s,]*(?:k)?/gi);
  if (!matches) return null;

  const numbers: number[] = [];
  for (const m of matches) {
    const raw = m.replace(/,/g, "").replace(/\s/g, "").toLowerCase();
    let num = parseFloat(raw);
    if (raw.includes("k")) num *= 1000;
    if (!isNaN(num) && num > 0) numbers.push(num);
  }

  if (numbers.length === 0) return null;

  const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  let min = Math.min(...numbers);
  let max = Math.max(...numbers);

  if (avg >= 10000) {
    min /= 12;
    max /= 12;
  }

  return { min, max };
}

function scoreSalary(salary: string | number | null | undefined, profile: Profile): number {
  const pMin = profile.desired_salary_min;
  const pMax = profile.desired_salary_max;

  if ((pMin === undefined || pMin === null || pMin === "") && (pMax === undefined || pMax === null || pMax === "")) {
    return 0.75;
  }

  const parsed = parseSalaryToMonthly(salary ?? "");
  if (!parsed) return 0.65;

  const min = Number(pMin) || 0;
  const max = Number(pMax) || Infinity;
  const profileAvg = min + (max === Infinity ? min : max);
  const isAnnual = profileAvg >= 20000;
  const normMin = isAnnual ? min / 12 : min;
  const normMax = max === Infinity ? Infinity : (isAnnual ? max / 12 : max);

  if (parsed.max >= normMin && parsed.min <= normMax) return 1.0;
  if (parsed.min > normMax && normMax !== Infinity) return Math.max(0, (normMax / parsed.min) * 0.6);
  if (parsed.max < normMin) return Math.max(0, (parsed.max / normMin) * 0.6);
  return 0.5;
}

function getProfileIndustries(profile: Profile): string[] {
  const val = profile.industries;
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s) => s.toLowerCase().trim());
  return val.split(/[,;]/).map((s) => s.toLowerCase().trim()).filter(Boolean);
}

function scoreIndustry(sector: string | undefined, profile: Profile): number {
  const industries = getProfileIndustries(profile);
  if (industries.length === 0) return 0.75;

  const sec = (sector || "").toLowerCase();
  const map: Record<string, string[]> = {
    fintech: ["fintech", "finance", "technology", "financial services"],
    tech: ["technology", "software", "saas", "internet", "e-commerce", "consulting"],
    technology: ["technology", "software", "saas", "internet", "e-commerce"],
    banking: ["banking", "finance", "financial services"],
    finance: ["finance", "banking", "fintech", "financial services"],
    healthcare: ["healthcare", "pharmaceuticals", "biotech", "medical"],
    pharmaceuticals: ["pharmaceuticals", "healthcare", "biotech"],
    retail: ["retail", "e-commerce", "consumer goods"],
    "e-commerce": ["e-commerce", "retail", "technology"],
    consulting: ["consulting", "professional services", "technology"],
    telecommunications: ["telecommunications", "telecom", "technology"],
    energy: ["energy", "utilities", "oil and gas"],
    government: ["government", "public sector"],
    insurance: ["insurance", "finance", "fintech"],
    gaming: ["gaming", "technology", "entertainment"],
    crypto: ["crypto", "fintech", "technology"],
  };

  for (const ind of industries) {
    if (sec === ind) return 1.0;
    if ((map[sec] || []).includes(ind)) return 0.85;
  }

  return 0.0;
}

function scoreJobType(jobType: string | undefined, profile: Profile): number {
  const userType = (profile.job_type || "").toLowerCase();
  if (!userType || userType === "any") return 0.85;

  const job = (jobType || "").toLowerCase();
  const normalize = (t: string) => t.replace(/[-\s]/g, "");

  if (normalize(job).includes(normalize(userType))) return 1.0;
  if (userType.includes("full-time") && job.includes("full")) return 1.0;
  if (userType.includes("part-time") && job.includes("part")) return 1.0;
  if (userType.includes("contract") && job.includes("contract")) return 1.0;
  if (userType.includes("internship") && (job.includes("intern") || job.includes("trainee"))) return 1.0;

  return 0.25;
}

export function calculateMatchScore(job: Job, profile: Profile): number {
  const roleScore = scoreRoleMatch(job.role, job.description || "", getSearchTerms(profile));
  const workTypeScore = scoreWorkType(job, profile.work_type || "");
  const locationScore = scoreLocation(job.location || "", profile.desired_location || "");
  const experienceScore = scoreExperienceLevel(job.role, job.description || "", profile.experience_level || "");
  const salaryScore = scoreSalary(job.salary, profile);
  const industryScore = scoreIndustry(job.sector, profile);
  const jobTypeScore = scoreJobType(job.job_type, profile);

  let score = (
    roleScore * 0.30 +
    workTypeScore * 0.20 +
    locationScore * 0.20 +
    experienceScore * 0.10 +
    salaryScore * 0.10 +
    industryScore * 0.05 +
    jobTypeScore * 0.05
  ) * 100;

  if (workTypeScore < 0.25) score -= 30;
  if ((profile.experience_level || "").toLowerCase().includes("entry") && experienceScore < 0.25) score -= 25;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function sortJobsByMatchScore(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}

export function filterJobsByProfile(jobs: Job[], minScore: number = 25): Job[] {
  return jobs.filter((job) => (job.match_score || 0) >= minScore);
}
