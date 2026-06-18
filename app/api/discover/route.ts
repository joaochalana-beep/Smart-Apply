import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_INDEED_ACTOR_ID = process.env.APIFY_INDEED_ACTOR_ID;

const ADZUNA_SUPPORTED = new Set(["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "ie", "in", "it", "mx", "nl", "nz", "pl", "pt", "sg", "us", "za"]);
const ADZUNA_EU_COUNTRIES = ["gb", "de", "fr", "es", "nl", "it", "at", "be", "ch", "pl", "pt", "ie"];

const APIFY_COUNTRIES: Record<string, string> = {
  "portugal": "PT", "lisbon": "PT", "lisboa": "PT", "porto": "PT",
  "spain": "ES", "madrid": "ES", "barcelona": "ES", "valencia": "ES",
  "germany": "DE", "france": "FR", "uk": "GB", "ireland": "IE",
  "italy": "IT", "netherlands": "NL", "belgium": "BE", "austria": "AT",
  "switzerland": "CH", "sweden": "SE", "denmark": "DK", "norway": "NO",
  "finland": "FI", "poland": "PL", "czech republic": "CZ", "greece": "GR",
  "brazil": "BR", "mexico": "MX", "argentina": "AR", "australia": "AU",
  "new zealand": "NZ", "japan": "JP", "canada": "CA", "usa": "US", "united states": "US",
};

const countryMap: Record<string, string> = {
  "united kingdom": "gb", "uk": "gb", "london": "gb", "england": "gb",
  "germany": "de", "deutschland": "de", "berlin": "de", "munich": "de", "munchen": "de",
  "hamburg": "de", "cologne": "de", "koln": "de", "frankfurt": "de", "stuttgart": "de",
  "dresden": "de", "leipzig": "de", "dusseldorf": "de", "nuremberg": "de", "nurnberg": "de",
  "hannover": "de", "bremen": "de", "essen": "de", "dortmund": "de",
  "spain": "es", "madrid": "es", "barcelona": "es", "valencia": "es",
  "france": "fr", "paris": "fr", "lyon": "fr", "marseille": "fr",
  "netherlands": "nl", "amsterdam": "nl", "rotterdam": "nl",
  "italy": "it", "rome": "it", "milano": "it", "milan": "it",
  "belgium": "be", "brussels": "be",
  "austria": "at", "vienna": "at", "wien": "at",
  "ireland": "ie", "dublin": "ie",
  "switzerland": "ch", "zurich": "ch", "geneva": "ch",
  "poland": "pl", "warsaw": "pl",
  "portugal": "pt", "lisbon": "pt", "lisboa": "pt", "porto": "pt",
  "sweden": "se", "stockholm": "se",
  "denmark": "dk", "copenhagen": "dk",
  "norway": "no", "oslo": "no",
  "finland": "fi", "helsinki": "fi",
};

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>|<\/h[1-6]>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getSearchTerms(profile: any): string[] {
  const roles = (profile.desired_role || "")
    .split(/[;,]/)
    .map((r: string) => r.trim())
    .filter(Boolean);
  if (roles.length > 0) return roles;
  return [(profile.desired_role || "software engineer").trim()];
}

function getSimpleSearchQuery(profile: any): string {
  const roles = (profile.desired_role || "")
    .split(/[;,]/)
    .map((r: string) => r.trim())
    .filter(Boolean);
  if (roles.length > 0) {
    const firstRole = roles[0];
    const words = firstRole.split(/\s+/).slice(0, 3).join(" ");
    return words;
  }
  return "software engineer";
}

function isGermanOrGenericLocation(loc: string): boolean {
  if (!loc || loc.trim() === "") return true;
  const generic = ["remote", "europe", "eu", "anywhere", "worldwide", "global"];
  if (generic.some(g => loc.includes(g))) return true;
  const german = ["germany", "deutschland", "berlin", "munich", "munchen", "hamburg", "cologne", "koln", "frankfurt", "stuttgart", "dresden", "leipzig", "dusseldorf", "nuremberg", "nurnberg", "hannover", "bremen", "essen", "dortmund"];
  return german.some(g => loc.includes(g));
}

function getApifyCountry(loc: string): string | null {
  const locLower = loc.toLowerCase();
  for (const [key, code] of Object.entries(APIFY_COUNTRIES)) {
    if (locLower.includes(key)) return code;
  }
  return null;
}

function isAdzunaSupported(loc: string): boolean {
  const locLower = loc.toLowerCase();
  for (const [key, code] of Object.entries(countryMap)) {
    if (locLower.includes(key) && ADZUNA_SUPPORTED.has(code)) return true;
  }
  return false;
}

// ============================================================================
// REALISTIC JOB MATCHING ENGINE
// ============================================================================

function scoreTitleMatch(jobTitle: string, desiredRoles: string[]): number {
  const title = jobTitle.toLowerCase();
  let bestScore = 0;

  for (const role of desiredRoles) {
    const roleLower = role.toLowerCase().trim();
    if (roleLower.length < 2) continue;

    if (title.includes(roleLower)) {
      bestScore = Math.max(bestScore, 50);
      continue;
    }

    const roleWords = roleLower.split(/\s+/).filter(w => w.length >= 3);
    let matchedWords = 0;
    for (const word of roleWords) {
      if (title.includes(word)) matchedWords++;
    }

    if (roleWords.length >= 2 && matchedWords === roleWords.length) {
      bestScore = Math.max(bestScore, 40);
    } else if (matchedWords >= 2) {
      bestScore = Math.max(bestScore, 25);
    } else if (matchedWords === 1) {
      bestScore = Math.max(bestScore, 10);
    }
  }

  return bestScore;
}

function scoreDescriptionMatch(jobDesc: string, desiredRoles: string[]): number {
  const desc = jobDesc.toLowerCase();
  let score = 0;

  for (const role of desiredRoles) {
    const roleLower = role.toLowerCase().trim();
    if (roleLower.length < 2) continue;

    if (desc.includes(roleLower)) {
      score += 15;
      continue;
    }

    const words = roleLower.split(/\s+/).filter(w => w.length >= 3);
    for (const word of words) {
      if (desc.includes(word)) score += 5;
    }
  }

  return Math.min(30, score);
}

function scoreExperienceLevel(jobTitle: string, jobDesc: string, userLevel: string): number {
  const fullText = `${jobTitle} ${jobDesc}`.toLowerCase();
  const userLevelLower = userLevel.toLowerCase().trim();

  if (!userLevelLower || userLevelLower === "any") return 0;

  const hasSenior = /\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief|architect|manager|5\+ years|6\+ years|7\+ years|8\+ years|10\+ years)\b/i.test(fullText);
  const hasMid = /\b(mid|mid-level|intermediate|2-5 years|3\+ years|4\+ years|level 2|level ii)\b/i.test(fullText);
  const hasEntry = /\b(entry|entry-level|junior|jr\.?|graduate|grad|intern|trainee|0-2|1-2|1\+ years|no experience|early career|fresh)\b/i.test(fullText);

  const isUserEntry = userLevelLower.includes("entry") || userLevelLower.includes("junior") || userLevelLower.includes("grad") || userLevelLower.includes("intern");
  const isUserMid = userLevelLower.includes("mid") || userLevelLower.includes("intermediate");
  const isUserSenior = userLevelLower.includes("senior") || userLevelLower.includes("lead") || userLevelLower.includes("principal");

  if (isUserEntry) {
    if (hasSenior) return -60;
    if (hasMid) return -30;
    if (hasEntry) return 25;
    return 0;
  }

  if (isUserMid) {
    if (hasSenior) return -20;
    if (hasEntry) return 10;
    if (hasMid) return 20;
    return 0;
  }

  if (isUserSenior) {
    if (hasEntry) return -15;
    if (hasMid) return 10;
    if (hasSenior) return 25;
    return 0;
  }

  return 0;
}

function scoreLocation(jobLoc: string, desiredLoc: string, isRemote: boolean): number {
  if (!desiredLoc || desiredLoc.trim() === "") return 0;

  const jobLower = (jobLoc || "").toLowerCase();
  const desiredLower = desiredLoc.toLowerCase();

  if (isRemote) {
    if (jobLower.includes("remote") || jobLower.includes("work from home") || jobLower.includes("wfh")) return 20;
    if (jobLower.includes("hybrid")) return 10;
    if (jobLower.includes("on-site") || jobLower.includes("onsite")) return -10;
  }

  if (desiredLower.includes("portugal") || desiredLower.includes("lisbon") || desiredLower.includes("porto")) {
    if (jobLower.includes("portugal") || jobLower.includes("lisbon") || jobLower.includes("porto") || jobLower.includes("lisboa")) return 25;
    if (jobLower.includes("remote")) return 15;
  }

  if (desiredLower.includes("spain") || desiredLower.includes("madrid") || desiredLower.includes("barcelona")) {
    if (jobLower.includes("spain") || jobLower.includes("madrid") || jobLower.includes("barcelona") || jobLower.includes("valencia")) return 25;
  }

  if (desiredLower.includes("germany") || desiredLower.includes("berlin")) {
    if (jobLower.includes("germany") || jobLower.includes("berlin") || jobLower.includes("munich") || jobLower.includes("hamburg")) return 25;
  }

  if (desiredLower.includes("europe") || desiredLower.includes("eu")) {
    const euCountries = ["germany", "france", "netherlands", "italy", "spain", "portugal", "belgium", "austria", "switzerland", "ireland", "poland", "sweden", "denmark", "norway", "finland"];
    if (euCountries.some(c => jobLower.includes(c))) return 20;
  }

  return 0;
}

function scoreWorkType(job: any, isRemote: boolean, userWorkType: string): number {
  const text = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();
  const userWT = (userWorkType || "").toLowerCase();

  const isJobRemote = text.includes("remote") || text.includes("work from home") || text.includes("wfh") || text.includes("home office");
  const isJobHybrid = text.includes("hybrid");
  const isJobOnsite = text.includes("on-site") || text.includes("onsite") || text.includes("in office") || text.includes("in-office");

  if (userWT.includes("remote")) {
    if (isJobRemote) return 15;
    if (isJobHybrid) return 5;
    if (isJobOnsite) return -15;
  }

  if (userWT.includes("hybrid")) {
    if (isJobHybrid) return 15;
    if (isJobRemote) return 10;
    if (isJobOnsite) return 0;
  }

  if (userWT.includes("on-site") || userWT.includes("onsite")) {
    if (isJobOnsite) return 15;
    if (isJobHybrid) return 5;
    if (isJobRemote) return -10;
  }

  return 0;
}

function scoreRecency(job: any): number {
  const posted = new Date(job.postedAt || job.datePosted || job.created_at || Date.now());
  const days = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1) return 5;
  if (days < 3) return 3;
  if (days < 7) return 2;
  return 0;
}

// ============================================================================
// LANGUAGE SCORING
// ============================================================================

function scoreLanguage(jobTitle: string, jobDesc: string, userLanguages: string[]): { score: number; missing: string[] } {
  if (!userLanguages || userLanguages.length === 0) return { score: 0, missing: [] };

  const fullText = `${jobTitle} ${jobDesc}`.toLowerCase();
  const userLangsLower = userLanguages.map(l => l.toLowerCase());

  const languagePatterns: Record<string, RegExp[]> = {
    german: [
      /\bgerman\b/i, /\bdeutsch\b/i, /\bgerman speaking\b/i, /\bgerman-speaking\b/i,
      /\bfluency in german\b/i, /\bgerman fluency\b/i, /\bgerman required\b/i,
      /\bgerman language\b/i, /\bnative.*german\b/i, /\bgerman.*native\b/i,
      /\bproficient.*german\b/i, /\bgerman.*proficient\b/i,
    ],
    english: [
      /\benglish\b/i, /\bfluent english\b/i, /\benglish fluency\b/i,
      /\benglish required\b/i, /\benglish speaking\b/i,
    ],
    portuguese: [
      /\bportuguese\b/i, /\bportugu[eê]s\b/i, /\bfluent.*portuguese\b/i,
      /\bportuguese.*required\b/i,
    ],
    spanish: [
      /\bspanish\b/i, /\bespa[nñ]ol\b/i, /\bspanish speaking\b/i,
      /\bspanish.*required\b/i,
    ],
    french: [
      /\bfrench\b/i, /\bfran[cç]ais\b/i, /\bfrench speaking\b/i,
      /\bfrench.*required\b/i,
    ],
    italian: [
      /\bitalian\b/i, /\bitaliano\b/i, /\bitalian.*required\b/i,
    ],
    dutch: [
      /\bdutch\b/i, /\bnederlands\b/i, /\bdutch.*required\b/i,
    ],
    russian: [
      /\brussian\b/i, /\brussian.*required\b/i,
    ],
    chinese: [
      /\bchinese\b/i, /\bmandarin\b/i, /\bchinese.*required\b/i,
    ],
    japanese: [
      /\bjapanese\b/i, /\bjapanese.*required\b/i,
    ],
    arabic: [
      /\barabic\b/i, /\barabic.*required\b/i,
    ],
    hindi: [
      /\bhindi\b/i, /\bhindi.*required\b/i,
    ],
    polish: [
      /\bpolish\b/i, /\bpolish.*required\b/i,
    ],
    turkish: [
      /\bturkish\b/i, /\bturkish.*required\b/i,
    ],
    swedish: [
      /\bswedish\b/i, /\bswedish.*required\b/i,
    ],
    danish: [
      /\bdanish\b/i, /\bdanish.*required\b/i,
    ],
    norwegian: [
      /\bnorwegian\b/i, /\bnorwegian.*required\b/i,
    ],
    finnish: [
      /\bfinnish\b/i, /\bfinnish.*required\b/i,
    ],
    greek: [
      /\bgreek\b/i, /\bgreek.*required\b/i,
    ],
    czech: [
      /\bczech\b/i, /\bczech.*required\b/i,
    ],
  };

  let penalty = 0;
  const missingLanguages: string[] = [];

  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    const isRequired = patterns.some(p => p.test(fullText));
    const userHasIt = userLangsLower.includes(lang);

    if (isRequired && !userHasIt) {
      penalty -= 30;
      missingLanguages.push(lang);
    }
  }

  // Extra penalty for explicit "required" language statements
  if (/german.*required|required.*german|must.*german|german.*must|fluent.*german.*required|native.*german/i.test(fullText)) {
    if (!userLangsLower.includes("german")) {
      penalty -= 40;
      if (!missingLanguages.includes("german")) missingLanguages.push("german");
    }
  }

  return { score: Math.max(-80, penalty), missing: missingLanguages };
}

// ============================================================================
// FINAL SCORE CALCULATION
// ============================================================================

function calculateMatchScore(job: any, profile: any): { score: number; reasons: string[] } {
  const title = job.title || job.positionName || job.role || "";
  const desc = job.description || job.jobDescription || "";
  const jobLoc = job.location || job.jobLocation || "";

  const desiredRoles = getSearchTerms(profile);
  const userExpLevel = String(profile.experience_level || "").toLowerCase().trim();
  const desiredLoc = (profile.desired_location || "").toLowerCase();
  const isRemote = desiredLoc.includes("remote") || (profile.work_type || "").toLowerCase() === "remote";
  const userWorkType = profile.work_type || "";
  const userLanguages = profile.languages || [];

  const reasons: string[] = [];
  let score = 0;

  // 1. TITLE MATCH (most important - max 50)
  const titleScore = scoreTitleMatch(title, desiredRoles);
  score += titleScore;
  if (titleScore >= 40) reasons.push("Exact title match");
  else if (titleScore >= 25) reasons.push("Good title match");
  else if (titleScore >= 10) reasons.push("Partial title match");

  // 2. DESCRIPTION MATCH (max 30)
  const descScore = scoreDescriptionMatch(desc, desiredRoles);
  score += descScore;
  if (descScore >= 15) reasons.push("Role mentioned in description");

  // 3. EXPERIENCE LEVEL (can be negative!)
  const expScore = scoreExperienceLevel(title, desc, userExpLevel);
  score += expScore;
  if (expScore >= 20) reasons.push("Matches your experience level");
  else if (expScore <= -30) reasons.push("Wrong experience level (too senior)");
  else if (expScore <= -15) reasons.push("May require more experience");

  // 4. LOCATION (max 25)
  const locScore = scoreLocation(jobLoc, desiredLoc, isRemote);
  score += locScore;
  if (locScore >= 20) reasons.push("Great location match");
  else if (locScore >= 10) reasons.push("Location OK");
  else if (locScore < 0) reasons.push("Wrong location type");

  // 5. WORK TYPE (max 15, min -15)
  const workScore = scoreWorkType(job, isRemote, userWorkType);
  score += workScore;
  if (workScore >= 10) reasons.push("Matches work type preference");
  else if (workScore < 0) reasons.push("Wrong work type");

  // 6. RECENCY (max 5)
  const recencyScore = scoreRecency(job);
  score += recencyScore;

  // 7. LANGUAGE (can be negative!)
  const langResult = scoreLanguage(title, desc, userLanguages);
  score += langResult.score;
  if (langResult.missing.length > 0) {
    reasons.push(`Requires ${langResult.missing.join(", ")} (you don't speak it)`);
  }

  // HARD FILTERS
  if (expScore <= -30 && titleScore < 20) {
    score = Math.min(score, 15);
    reasons.push("Likely overqualified role");
  }

  if (titleScore === 0 && descScore === 0) {
    score = Math.min(score, 10);
    reasons.push("No role relevance detected");
  }

  if (langResult.score <= -40) {
    score = Math.min(score, 20);
    reasons.push("Language barrier");
  }

  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}

// ============================================================================
// COMPANY JOBS FETCHER (PRIMARY SOURCE)
// ============================================================================
async function fetchCompanyJobs(searchTerms: string[], location: string, isRemote: boolean, limit: number = 100) {
  console.log(`[CompanyJobs] Searching for: ${searchTerms.join(", ")} in ${location || "any location"}`);

  // Build ILIKE conditions for title matching
  const titleConditions = searchTerms.map(term => {
    const cleanTerm = term.replace(/[%_]/g, "\$&");
    return `role.ilike.%${cleanTerm}%`;
  }).join(",");

  // Build location conditions
  const locLower = location.toLowerCase().trim();
  let locationFilter = "";

  if (locLower && !locLower.includes("europe") && !locLower.includes("eu") && !locLower.includes("anywhere") && !locLower.includes("remote")) {
    const locTerms = locLower.split(/\s+/).filter(Boolean);
    const locConditions = locTerms.map(term => `location.ilike.%${term}%`).join(",");
    locationFilter = locConditions;
  }

  // Query 1: company careers from all three sources
  let query = supabase
    .from("jobs")
    .select("*")
    .or(`source.eq.company_careers_greenhouse,source.eq.company_careers_lever,source.eq.company_careers_unknown`)
    .or(titleConditions)
    .limit(limit);

  if (locationFilter) {
    query = query.or(locationFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[CompanyJobs] Error:", error);
    throw new Error(`Company jobs fetch failed: ${error.message}`);
  }

  const jobs = data || [];
  console.log(`[CompanyJobs] Found ${jobs.length} company jobs`);

  // Normalize company jobs to unified format
  return jobs.map((job: any) => ({
    id: job.id,
    title: job.role || "Unknown Role",
    company: job.company || "Unknown",
    location: job.location || "Unknown",
    description: stripHtml(job.description || ""),
    url: job.url || "#",
    salary: job.salary || null,
    remote: job.work_type?.toLowerCase().includes("remote") || 
            job.location?.toLowerCase().includes("remote") || false,
    source: job.source?.replace("company_careers_", "").replace(/^./, (c: string) => c.toUpperCase()) || "Company",
    postedAt: job.created_at,
    datePosted: job.created_at,
    created_at: job.created_at,
    // Preserve original fields for scoring
    role: job.role,
    work_type: job.work_type,
    job_type: job.job_type,
    experience_level: job.experience_level,
  }));
}

// ============================================================================
// MAIN DISCOVER HANDLER
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Discover] Profile fetch error:", profileError);
    }

    // Use defaults if profile is missing — never block job discovery
    const safeProfile = rawProfile || {};
    const effectiveProfile = {
      desired_role: safeProfile.desired_role || "software engineer",
      desired_location: safeProfile.desired_location || "remote",
      work_type: safeProfile.work_type || "remote",
      experience_level: String(safeProfile.experience_level || "mid"),
      languages: Array.isArray(safeProfile.languages) ? safeProfile.languages : [],
      id: safeProfile.id || userId,
      ...safeProfile
    };

    const searchTerms = getSearchTerms(effectiveProfile);
    const rawLocation = (effectiveProfile.desired_location || "").toLowerCase().trim().replace(/\s+/g, " ");
    const isRemote = rawLocation.includes("remote") || (effectiveProfile.work_type || "").toLowerCase() === "remote";
    const location = rawLocation.replace(/remote/g, "").replace(/,/g, " ").trim();

    const apifyCountry = getApifyCountry(rawLocation);
    const adzunaSupported = isAdzunaSupported(rawLocation);
    const isGerman = isGermanOrGenericLocation(location);

    let allJobs: any[] = [];
    let primarySource = "";
    let sourcesUsed: string[] = [];
    const errors: Record<string, string> = {};
    const seenUrls = new Set<string>();

    // ============================================================================
    // STEP 1: COMPANY JOBS (PRIMARY)
    // ============================================================================
    try {
      const companyJobs = await fetchCompanyJobs(searchTerms, location, isRemote, 150);
      for (const job of companyJobs) {
        if (!seenUrls.has(job.url)) {
          seenUrls.add(job.url);
          allJobs.push(job);
        }
      }
      primarySource = "company_careers";
      sourcesUsed.push("company_careers");
      console.log(`[Discover] Company jobs returned ${companyJobs.length} unique jobs`);
    } catch (err: any) {
      errors["company_careers"] = err.message;
      console.error("[Discover] Company jobs failed:", err.message);
    }

    // ============================================================================
    // STEP 2: ADZUNA (FALLBACK - only if company jobs < 30 or Adzuna explicitly needed)
    // ============================================================================
    const MIN_JOBS_TARGET = 30;

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY && allJobs.length < MIN_JOBS_TARGET) {
      try {
        const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
        let added = 0;
        for (const job of adzunaJobs) {
          const url = job.url || `#adzuna_${job.id}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            allJobs.push({ ...job, url });
            added++;
          }
        }
        if (added > 0) {
          sourcesUsed.push("adzuna");
          console.log(`[Discover] Adzuna added ${added} new jobs`);
        }
        if (!primarySource) primarySource = "adzuna";
      } catch (err: any) {
        errors["adzuna"] = err.message;
        console.error("[Discover] Adzuna failed:", err.message);
      }
    }

    // ============================================================================
    // STEP 3: ARBEITNOW (THIRD - only if still below target)
    // ============================================================================
    if (allJobs.length < MIN_JOBS_TARGET) {
      try {
        const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, true);
        let added = 0;
        for (const job of arbeitnowJobs) {
          const url = job.url || `#arbeitnow_${job.slug}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            allJobs.push({ ...job, url });
            added++;
          }
        }
        if (added > 0) {
          sourcesUsed.push("arbeitnow");
          console.log(`[Discover] Arbeitnow added ${added} new jobs`);
        }
        if (!primarySource) primarySource = "arbeitnow";
      } catch (err: any) {
        errors["arbeitnow"] = err.message;
        console.error("[Discover] Arbeitnow failed:", err.message);
      }
    }

    // ============================================================================
    // STEP 4: LEGACY APIFY FALLBACK (only if everything else failed)
    // ============================================================================
    if (allJobs.length === 0 && APIFY_API_TOKEN) {
      try {
        const apifyJobs = await fetchApifyIndeed(effectiveProfile, location, isRemote, "GB");
        for (const job of apifyJobs) {
          const url = job.url || `https://www.indeed.com/viewjob?jk=${job.id}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            allJobs.push({ ...job, url });
          }
        }
        primarySource = "apify_indeed";
        sourcesUsed.push("apify_indeed");
      } catch (err: any) {
        errors["apify_indeed"] = err.message;
      }
    }

    // ============================================================================
    // SCORE & FORMAT ALL JOBS
    // ============================================================================
    const scored = allJobs.map((job: any) => {
      const isCompanyJob = job.source && (job.source.includes("Greenhouse") || job.source.includes("Lever") || job.source.includes("Unknown") || job.source === "Company");
      const isArbeitnow = job.slug !== undefined && !isCompanyJob;
      const isApify = (job.positionName !== undefined || (job.id !== undefined && job.url !== undefined && job.company !== undefined)) && !isCompanyJob && !isArbeitnow;

      const { score, reasons } = calculateMatchScore(job, effectiveProfile);

      let source = job.source || "Adzuna";
      if (isCompanyJob) source = job.source || "Company Careers";
      else if (isArbeitnow) source = "Arbeitnow";
      else if (isApify) source = "Indeed";

      return {
        id: isCompanyJob ? `company_${job.id}` : (isArbeitnow ? `arbeitnow_${job.slug}` : (isApify ? `indeed_${job.id}` : `adzuna_${job.id}`)),
        title: job.title || job.positionName || job.jobTitle || "Unknown Role",
        company: job.company || job.companyName || job.hiringOrganization?.name || "Unknown",
        location: job.location || job.jobLocation || "Unknown",
        description: stripHtml(job.description || job.jobDescription || job.positionDescription || ""),
        url: job.url || "#",
        salary: job.salary || job.salaryRange || job.salaryCurrency || null,
        remote: !!job.remote || (job.jobType && Array.isArray(job.jobType) && job.jobType.some((t: string) => t.toLowerCase().includes("remote"))) || `${job.title} ${job.description} ${job.location}`.toLowerCase().includes("remote"),
        source,
        match_score: score,
        score: score,
        match_reasons: reasons,
        created_at: job.postedAt || job.datePosted || job.created_at || new Date().toISOString(),
      };
    });

    const filtered = scored.filter((j: any) => {
      if (j.score >= 20) return true;
      const title = j.title.toLowerCase();
      const roles = getSearchTerms(effectiveProfile);
      for (const role of roles) {
        const words = role.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
        for (const word of words) {
          if (title.includes(word)) return true;
        }
      }
      return false;
    });

    const seen = new Set();
    const deduped = filtered.filter((j: any) => {
      if (seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });

    deduped.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // ============================================================================
    // SAVE TO USER'S JOBS TABLE (only non-company jobs, or update if needed)
    // ============================================================================
    const toUpsert = deduped
      .filter((j: any) => !j.id.startsWith("company_")) // Don't re-save company jobs that are already in DB
      .map((j: any) => ({
        job_id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        description: j.description,
        url: j.url,
        salary: j.salary,
        remote: j.remote,
        source: j.source,
        user_id: userId,
        status: "new",
        score: j.score,
        created_at: j.created_at,
      }));

    if (toUpsert.length > 0) {
      await supabase.from("jobs").upsert(toUpsert, { onConflict: "job_id" });
    }

    return NextResponse.json({
      jobs: deduped.slice(0, 50),
      count: deduped.length,
      source: primarySource,
      sourcesUsed,
      searchTerms,
      location: location || "any",
      isRemote,
      debug: {
        rawLocation: effectiveProfile.desired_location,
        parsedLocation: location,
        isRemote,
        userExpLevel: effectiveProfile.experience_level,
        userLanguages: effectiveProfile.languages || [],
        apifyCountry,
        adzunaSupported,
        isGerman,
        apifyConfigured: !!APIFY_API_TOKEN,
        adzunaConfigured: !!(ADZUNA_APP_ID && ADZUNA_APP_KEY),
        scoreDistribution: {
          excellent: deduped.filter((j: any) => j.score >= 80).length,
          good: deduped.filter((j: any) => j.score >= 60 && j.score < 80).length,
          decent: deduped.filter((j: any) => j.score >= 40 && j.score < 60).length,
          low: deduped.filter((j: any) => j.score >= 20 && j.score < 40).length,
          filtered: scored.length - filtered.length,
        },
        errors,
        totalJobsFound: allJobs.length,
        jobsAfterScoring: scored.length,
        jobsAfterFilter: filtered.length,
        jobsAfterDedup: deduped.length,
      }
    });
  } catch (err: any) {
    console.error("Discover error:", err);
    return NextResponse.json({ error: "Internal error", details: err.message }, { status: 500 });
  }
}

// ============================================================================
// APIFY INDEED SCRAPER
// ============================================================================
async function fetchApifyIndeed(profile: any, location: string, isRemote: boolean, country: string) {
  if (!APIFY_API_TOKEN || !APIFY_INDEED_ACTOR_ID) {
    throw new Error("Apify not configured");
  }

  const query = getSimpleSearchQuery(profile);

  const locLower = location.toLowerCase().trim();
  const countryNames = ["portugal", "spain", "germany", "france", "united kingdom", "uk", "italy", "netherlands", "belgium", "austria", "switzerland", "ireland"];
  const isCountryName = countryNames.some(c => locLower === c || locLower.includes(c));
  const loc = isCountryName ? "" : (location || (isRemote ? "Remote" : ""));

  const actorIdForUrl = APIFY_INDEED_ACTOR_ID.replace("/", "~");
  const countryUpper = country.toUpperCase();

  const startUrl = `https://api.apify.com/v2/acts/${actorIdForUrl}/runs?token=${APIFY_API_TOKEN}`;

  const input = {
    position: query,
    location: loc,
    country: countryUpper,
    maxItems: 50,
    saveOnlyUniqueItems: true,
  };

  console.log(`[Apify] STARTING RUN with simplified input:`, JSON.stringify(input));

  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  console.log(`[Apify] Start response status: ${startRes.status}`);

  if (!startRes.ok) {
    const errorText = await startRes.text();
    console.error(`[Apify] Start failed body:`, errorText);
    throw new Error(`Apify start failed: ${startRes.status} - ${errorText.slice(0, 300)}`);
  }

  const startData = await startRes.json();
  const runId = startData.data?.id;
  const datasetId = startData.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error(`Apify start returned invalid data`);
  }

  console.log(`[Apify] Run ID: ${runId}, Dataset ID: ${datasetId}`);

  const maxWait = 120;
  const pollInterval = 5;
  let waited = 0;
  let finalStatus = "";

  while (waited < maxWait) {
    await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
    waited += pollInterval;

    const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();

    finalStatus = statusData.data?.status;
    console.log(`[Apify] Poll ${waited}s: status=${finalStatus}`);

    if (finalStatus === "SUCCEEDED") {
      break;
    }
    if (finalStatus === "FAILED" || finalStatus === "ABORTED" || finalStatus === "TIMED-OUT") {
      throw new Error(`Apify run failed with status: ${finalStatus}`);
    }
  }

  if (finalStatus !== "SUCCEEDED") {
    throw new Error(`Apify run timed out after ${maxWait}s`);
  }

  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`;
  const resultsRes = await fetch(datasetUrl);

  if (!resultsRes.ok) {
    throw new Error(`Apify dataset fetch failed: ${resultsRes.status}`);
  }

  const jobs = await resultsRes.json();
  console.log(`[Apify] Raw jobs count: ${jobs.length}`);

  if (jobs.length === 1 && jobs[0].error) {
    console.error(`[Apify] Actor returned error:`, jobs[0].error);
    return [];
  }

  return jobs;
}

// ============================================================================
// ARBEITNOW API
// ============================================================================
async function fetchArbeitnow(searchTerms: string[], location: string, isRemote: boolean, isUnsupported: boolean) {
  const query = searchTerms.join(" ");
  let locationParam = "";

  if (!isUnsupported && location && !location.includes("europe") && !location.includes("eu") && !location.includes("anywhere")) {
    locationParam = `&location=${encodeURIComponent(location)}`;
  }

  const remoteParam = isRemote ? "&remote=true" : "";
  const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}${locationParam}${remoteParam}&page=1`;
  console.log("[Arbeitnow] URL:", url);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Arbeitnow API ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.data || [];
}

// ============================================================================
// ADZUNA MULTI-COUNTRY
// ============================================================================
async function fetchAdzunaMultiCountry(searchTerms: string[], location: string, isRemote: boolean) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Adzuna credentials not configured");
  }

  const searchQuery = searchTerms.join(" ");
  const allResults: any[] = [];
  const errors: string[] = [];

  let countriesToSearch: string[] = [];

  let specificCountry = "";
  for (const [key, code] of Object.entries(countryMap)) {
    if (location.includes(key)) {
      specificCountry = code;
      break;
    }
  }

  if (specificCountry && ADZUNA_SUPPORTED.has(specificCountry)) {
    countriesToSearch.push(specificCountry);
  }

  if (isRemote || !specificCountry) {
    for (const country of ADZUNA_EU_COUNTRIES) {
      if (!countriesToSearch.includes(country)) {
        countriesToSearch.push(country);
      }
    }
  }

  console.log(`[Adzuna] Searching ${countriesToSearch.length} countries: ${countriesToSearch.join(", ")}`);

  const searchCountries = countriesToSearch.slice(0, 6);

  for (const country of searchCountries) {
    try {
      const jobs = await fetchAdzunaSingleCountry(searchQuery, location, isRemote, country);
      console.log(`[Adzuna] ${country}: ${jobs.length} jobs`);
      allResults.push(...jobs);
    } catch (err: any) {
      console.error(`[Adzuna] ${country} failed:`, err.message);
      errors.push(`${country}: ${err.message}`);
    }
  }

  if (allResults.length === 0 && errors.length > 0) {
    throw new Error(`All Adzuna searches failed: ${errors.join("; ")}`);
  }

  console.log(`[Adzuna] Total results from all countries: ${allResults.length}`);
  return allResults;
}

async function fetchAdzunaSingleCountry(searchQuery: string, location: string, isRemote: boolean, country: string) {
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID!,
    app_key: ADZUNA_APP_KEY!,
    results_per_page: "20",
  });

  let what = searchQuery;
  if (isRemote) {
    what = `${what} remote`;
  }
  params.append("what", what);

  if (location && !location.includes("europe") && !location.includes("eu") && !location.includes("anywhere") && !location.includes("remote")) {
    const locationCountry = Object.entries(countryMap).find(([key]) => location.includes(key))?.[1];
    if (!locationCountry || locationCountry === country || ADZUNA_SUPPORTED.has(country)) {
      params.append("where", location);
    }
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
  console.log(`[Adzuna] ${country} URL:`, url);

  const res = await fetch(url, { next: { revalidate: 0 } });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${responseText.slice(0, 100)}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid JSON: ${responseText.slice(0, 100)}`);
  }

  return data.results || [];
}