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

const ADZUNA_SUPPORTED = new Set(["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za"]);
const ADZUNA_EU_COUNTRIES = ["gb", "de", "fr", "es", "nl", "it", "at", "be", "ch", "pl"];

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
  "ireland": "gb", "dublin": "gb",
  "switzerland": "ch", "zurich": "ch", "geneva": "ch",
  "poland": "pl", "warsaw": "pl",
  "sweden": "gb", "stockholm": "gb",
  "denmark": "gb", "copenhagen": "gb",
  "norway": "gb", "oslo": "gb",
  "finland": "gb", "helsinki": "gb",
};

// Generic words to ignore when extracting keywords
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "her", "its", "our", "their", "this", "that", "these", "those",
  "am", "can", "shall", "need", "want", "looking", "seeking", "opportunity", "position",
  "role", "job", "work", "employment", "career", "professional", "qualified", "experienced",
  "responsible", "duties", "tasks", "requirements", "skills", "ability", "knowledge",
  "excellent", "good", "strong", "proven", "track", "record", "minimum", "maximum",
  "plus", "preferred", "required", "essential", "desirable", "nice", "must", "should",
  "will", "shall", "etc", "e.g", "ie", "per", "annum", "pa", "neg", "negotiable",
  "competitive", "depending", "experience", "based", "located", "area", "region",
  "immediate", "start", "starting", "asap", "soon", "possible", "apply", "applying",
  "application", "contact", "email", "phone", "tel", "www", "http", "https", "com",
]);

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<<\/li>/gi, "\n")
    .replace(/<<\/p>|<\/h[1-6]>/gi, "\n\n")
    .replace(/<<br\s*\/?>/gi, "\n")
    .replace(/<<[^>]+>/g, "")
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

// Extract meaningful keywords from a role string
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s&+\-#]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  
  // Also extract multi-word phrases (e.g., "data analyst", "customer support")
  const phrases: string[] = [];
  const cleanText = text.toLowerCase().replace(/[^\w\s&+\-#]/g, " ").trim();
  
  // Add the full role if it's reasonable length
  if (cleanText.length > 2 && cleanText.length < 60) {
    phrases.push(cleanText);
  }
  
  // Add individual meaningful words
  words.forEach(w => {
    if (w.length >= 3 && !phrases.includes(w)) {
      phrases.push(w);
    }
  });
  
  // Add common 2-word combinations
  const wordList = cleanText.split(/\s+/).filter(w => w.length > 1);
  for (let i = 0; i < wordList.length - 1; i++) {
    const phrase = `${wordList[i]} ${wordList[i + 1]}`;
    if (!STOP_WORDS.has(wordList[i]) && !STOP_WORDS.has(wordList[i + 1])) {
      phrases.push(phrase);
    }
  }
  
  return [...new Set(phrases)];
}

// Get a simple search query for Apify (first role, max 3 words)
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
// EXPERIENCE LEVEL DETECTION
// ============================================================================

type ExperienceLevel = "entry" | "junior" | "mid" | "senior" | "unknown";

const ENTRY_KEYWORDS = [
  "entry", "entry-level", "entry level", "junior", "jr", "jr.", "associate",
  "graduate", "grad", "intern", "internship", "trainee", "apprentice",
  "0-2", "0 to 2", "0-1", "0 to 1", "1-2", "1 to 2", "1+ years", "2+ years",
  "no experience", "little experience", "beginner", "starter", "fresh",
  "first job", "early career", "career start", "recent graduate", "new grad",
  "level 1", "level i", "l1", "i-", "i ", "1 ", "1-", "tier 1", "grade 1",
];

const SENIOR_KEYWORDS = [
  "senior", "sr", "sr.", "lead", "principal", "staff", "head of", "director",
  "vp", "vice president", "executive", "chief", "cto", "ceo", "cfo", "coo",
  "5+ years", "5-10", "5 to 10", "6+ years", "7+ years", "8+ years", "10+ years",
  "10-15", "15+ years", "experienced", "seasoned", "expert", "specialist",
  "manager", "management", "team lead", "tech lead", "architect",
  "level 3", "level iii", "level 4", "level iv", "l3", "l4", "iii", "iv",
  "tier 3", "tier 4", "grade 3", "grade 4", "seniority", "veteran",
];

const MID_KEYWORDS = [
  "mid", "mid-level", "mid level", "intermediate", "medium", "regular",
  "2-5", "2 to 5", "3-5", "3 to 5", "4-6", "3+ years", "4+ years",
  "level 2", "level ii", "l2", "ii", "2 ", "2-", "tier 2", "grade 2",
];

function detectExperienceLevel(text: string): ExperienceLevel {
  const lower = text.toLowerCase();
  
  // Check for explicit entry-level indicators first
  for (const kw of ENTRY_KEYWORDS) {
    if (lower.includes(kw)) return "entry";
  }
  
  // Check senior
  for (const kw of SENIOR_KEYWORDS) {
    if (lower.includes(kw)) return "senior";
  }
  
  // Check mid
  for (const kw of MID_KEYWORDS) {
    if (lower.includes(kw)) return "mid";
  }
  
  return "unknown";
}

function normalizeExperienceLevel(level: string): ExperienceLevel {
  const lower = level.toLowerCase().trim();
  if (lower.includes("entry") || lower.includes("junior") || lower.includes("grad") || lower.includes("intern") || lower.includes("associate")) {
    return "entry";
  }
  if (lower.includes("senior") || lower.includes("lead") || lower.includes("principal") || lower.includes("director") || lower.includes("manager")) {
    return "senior";
  }
  if (lower.includes("mid") || lower.includes("intermediate")) {
    return "mid";
  }
  return "unknown";
}

function scoreExperience(jobText: string, userLevel: string): number {
  const userExp = normalizeExperienceLevel(userLevel);
  if (userExp === "unknown") return 0;
  
  const jobExp = detectExperienceLevel(jobText);
  if (jobExp === "unknown") return 5; // Slightly positive for unclear listings
  
  const scoreMap: Record<ExperienceLevel, Record<ExperienceLevel, number>> = {
    entry: {
      entry: 35,
      junior: 30,
      mid: -25,
      senior: -50,
      unknown: 5,
    },
    junior: {
      entry: 20,
      junior: 30,
      mid: 10,
      senior: -40,
      unknown: 5,
    },
    mid: {
      entry: -10,
      junior: 15,
      mid: 30,
      senior: -15,
      unknown: 5,
    },
    senior: {
      entry: -30,
      junior: 0,
      mid: 20,
      senior: 35,
      unknown: 5,
    },
    unknown: {
      entry: 5,
      junior: 5,
      mid: 5,
      senior: 5,
      unknown: 0,
    },
  };
  
  return scoreMap[userExp][jobExp] || 0;
}

// ============================================================================
// ROLE MATCHING
// ============================================================================

function scoreRoleMatch(jobText: string, searchTerms: string[], desiredRole: string): number {
  const text = jobText.toLowerCase();
  let score = 0;
  const matchedTerms: string[] = [];
  
  // Extract keywords from desired role
  const allKeywords = extractKeywords(desiredRole);
  
  // Score for each keyword found
  for (const keyword of allKeywords) {
    const kw = keyword.toLowerCase();
    if (kw.length < 3) continue;
    
    // Whole word match (stronger)
    const wordRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordRegex.test(text)) {
      score += 15;
      matchedTerms.push(kw);
    }
    // Partial match (weaker)
    else if (text.includes(kw)) {
      score += 8;
      matchedTerms.push(kw);
    }
  }
  
  // Bonus for exact role phrase match
  for (const term of searchTerms) {
    const t = term.toLowerCase().trim();
    if (t.length < 3) continue;
    
    // Exact phrase in title gets big bonus
    if (text.includes(t)) {
      score += 20;
    }
    
    // Individual words from the term
    const termWords = t.split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
    let termWordMatches = 0;
    for (const tw of termWords) {
      if (text.includes(tw)) termWordMatches++;
    }
    if (termWordMatches === termWords.length && termWords.length >= 2) {
      score += 15; // All words from a role term matched
    }
  }
  
  // Cap role matching at 60 to leave room for other factors
  return Math.min(60, score);
}

// ============================================================================
// LOCATION MATCHING
// ============================================================================

function scoreLocation(jobLoc: string, desiredLoc: string, isRemote: boolean): number {
  if (!desiredLoc || desiredLoc.trim() === "") return 0;
  
  const jobLower = jobLoc.toLowerCase();
  const desiredLower = desiredLoc.toLowerCase();
  
  // Remote preference
  if (isRemote) {
    if (jobLower.includes("remote") || jobLower.includes("home office") || jobLower.includes("work from home") || jobLower.includes("wfh")) {
      return 25;
    }
    if (jobLower.includes("hybrid")) {
      return 15;
    }
  }
  
  // Generic locations
  if (desiredLower.includes("europe") || desiredLower.includes("eu")) {
    const euCountries = ["germany", "france", "netherlands", "italy", "spain", "portugal", "belgium", "austria", "switzerland", "poland", "sweden", "denmark", "norway", "finland", "ireland", "uk", "united kingdom", "london", "paris", "berlin", "madrid", "lisbon", "amsterdam", "rome", "vienna", "zurich", "warsaw", "stockholm", "copenhagen", "oslo", "helsinki", "dublin"];
    if (euCountries.some(c => jobLower.includes(c))) return 20;
    return 0;
  }
  
  // Exact location match
  if (jobLower.includes(desiredLower) || desiredLower.includes(jobLower)) {
    return 30;
  }
  
  // Country match (e.g., "Lisbon" matches "Portugal")
  for (const [key, code] of Object.entries(countryMap)) {
    if (desiredLower.includes(key)) {
      // Check if job location contains any city from same country
      for (const [city, countryCode] of Object.entries(countryMap)) {
        if (countryCode === code && jobLower.includes(city)) {
          return 20;
        }
      }
      // Check if job location contains country name
      if (jobLower.includes(key)) return 20;
    }
  }
  
  return 0;
}

// ============================================================================
// WORK TYPE MATCHING
// ============================================================================

function scoreWorkType(job: any, isRemote: boolean, userWorkType: string): number {
  const text = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();
  let score = 0;
  
  const jobType = job.jobType;
  const isJobRemote = !!job.remote || 
    text.includes("remote") || 
    text.includes("work from home") || 
    text.includes("home office") ||
    text.includes("wfh") ||
    (Array.isArray(jobType) && jobType.some((t: string) => t.toLowerCase().includes("remote")));
  
  const isJobHybrid = text.includes("hybrid");
  const isJobOnsite = text.includes("on-site") || text.includes("onsite") || text.includes("in office") || text.includes("in-office");
  
  const userWT = (userWorkType || "").toLowerCase();
  
  if (userWT.includes("remote")) {
    if (isJobRemote) score += 20;
    if (isJobHybrid) score += 10;
    if (isJobOnsite) score -= 10;
  } else if (userWT.includes("hybrid")) {
    if (isJobHybrid) score += 25;
    if (isJobRemote) score += 15;
    if (isJobOnsite) score += 5;
  } else if (userWT.includes("on-site") || userWT.includes("onsite")) {
    if (isJobOnsite) score += 20;
    if (isJobHybrid) score += 10;
    if (isJobRemote) score -= 15;
  } else {
    // No preference specified
    if (isJobRemote) score += 10;
    if (isJobHybrid) score += 10;
  }
  
  return score;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("desired_role, desired_location, work_type, experience_level, id")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("[Discover] Profile fetch error:", profileError);
    }

    if (!profile) {
      return NextResponse.json({ 
        error: "Profile not found", 
        needsProfileUpdate: true, 
        message: "Please complete your profile to discover jobs." 
      }, { status: 404 });
    }

    const searchTerms = getSearchTerms(profile);
    const rawLocation = (profile.desired_location || "").toLowerCase().trim().replace(/\s+/g, " ");
    const isRemote = rawLocation.includes("remote") || (profile.work_type || "").toLowerCase() === "remote";
    const location = rawLocation.replace(/remote/g, "").replace(/,/g, " ").trim();
    const userExpLevel = profile.experience_level || "";
    const userWorkType = profile.work_type || "";

    const apifyCountry = getApifyCountry(rawLocation);
    const adzunaSupported = isAdzunaSupported(rawLocation);
    const isGerman = isGermanOrGenericLocation(location);

    let allJobs: any[] = [];
    let primarySource = "";
    let sourcesUsed: string[] = [];
    const errors: Record<string, string> = {};

    // ========================================================================
    // STRATEGY DECISION
    // ========================================================================
    if (apifyCountry && APIFY_API_TOKEN) {
      primarySource = "apify_indeed";
      try {
        const apifyJobs = await fetchApifyIndeed(profile, location, isRemote, apifyCountry);
        allJobs = apifyJobs;
        sourcesUsed.push("apify_indeed");
        console.log(`[Discover] Apify Indeed returned ${apifyJobs.length} jobs for ${apifyCountry}`);
      } catch (err: any) {
        errors["apify_indeed"] = err.message;
        console.error("[Discover] Apify Indeed failed:", err.message);
      }

      if (allJobs.length < 5) {
        if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
          try {
            const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
            const newJobs = adzunaJobs.filter((aj: any) => !allJobs.some((j: any) => j.url === aj.url));
            allJobs = [...allJobs, ...newJobs];
            if (newJobs.length > 0) sourcesUsed.push("adzuna");
            console.log(`[Discover] Adzuna fallback added ${newJobs.length} jobs`);
          } catch (err: any) {
            errors["adzuna"] = err.message;
          }
        }
      }

      if (isRemote && allJobs.length < 20) {
        try {
          const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, true);
          const newJobs = arbeitnowJobs.filter((aj: any) => !allJobs.some((j: any) => j.url === aj.url));
          allJobs = [...allJobs, ...newJobs];
          if (newJobs.length > 0) sourcesUsed.push("arbeitnow");
          console.log(`[Discover] Arbeitnow supplement added ${newJobs.length} jobs`);
        } catch (err: any) {
          errors["arbeitnow"] = err.message;
        }
      }

    } else if (adzunaSupported) {
      primarySource = "adzuna";
      try {
        const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
        allJobs = adzunaJobs;
        sourcesUsed.push("adzuna");
        console.log(`[Discover] Adzuna returned ${adzunaJobs.length} jobs`);
      } catch (err: any) {
        errors["adzuna"] = err.message;
        console.error("[Discover] Adzuna failed:", err.message);
        try {
          const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, false);
          allJobs = arbeitnowJobs;
          primarySource = "arbeitnow";
          sourcesUsed.push("arbeitnow");
        } catch (arbeitnowErr: any) {
          errors["arbeitnow"] = arbeitnowErr.message;
          return NextResponse.json({
            error: "Both job sources failed",
            details: `Adzuna: ${err.message}, Arbeitnow: ${arbeitnowErr.message}`,
          }, { status: 502 });
        }
      }

    } else if (isGerman) {
      primarySource = "arbeitnow";
      try {
        const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, false);
        allJobs = arbeitnowJobs;
        sourcesUsed.push("arbeitnow");
      } catch (err: any) {
        errors["arbeitnow"] = err.message;
        console.error("[Discover] Arbeitnow failed:", err.message);
        if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
          try {
            const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
            allJobs = adzunaJobs;
            primarySource = "adzuna";
            sourcesUsed.push("adzuna");
          } catch (adzunaErr: any) {
            errors["adzuna"] = adzunaErr.message;
            return NextResponse.json({
              error: "Both job sources failed",
              details: `Arbeitnow: ${err.message}, Adzuna: ${adzunaErr.message}`,
            }, { status: 502 });
          }
        }
      }

    } else {
      if (APIFY_API_TOKEN) {
        try {
          const apifyJobs = await fetchApifyIndeed(profile, location, isRemote, "GB");
          allJobs = apifyJobs;
          primarySource = "apify_indeed";
          sourcesUsed.push("apify_indeed");
        } catch (err: any) {
          errors["apify_indeed"] = err.message;
        }
      }
      
      if (allJobs.length === 0 && ADZUNA_APP_ID && ADZUNA_APP_KEY) {
        try {
          const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
          allJobs = adzunaJobs;
          primarySource = "adzuna";
          sourcesUsed.push("adzuna");
        } catch (err: any) {
          errors["adzuna"] = err.message;
        }
      }
      
      if (allJobs.length === 0) {
        try {
          const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, false);
          allJobs = arbeitnowJobs;
          primarySource = "arbeitnow";
          sourcesUsed.push("arbeitnow");
        } catch (err: any) {
          errors["arbeitnow"] = err.message;
          return NextResponse.json({
            error: "All job sources failed",
            details: errors,
          }, { status: 502 });
        }
      }
    }

    // ========================================================================
    // PROCESS & SCORE RESULTS
    // ========================================================================
    const desiredLoc = (profile.desired_location || "").toLowerCase();
    const desiredRole = profile.desired_role || "";
    
    const mapped = allJobs.map((job: any) => {
      const isArbeitnow = job.slug !== undefined;
      const isApify = job.positionName !== undefined || (job.id !== undefined && job.url !== undefined && job.company !== undefined);
      
      const jobTitle = job.positionName || job.title || job.jobTitle || "";
      const jobDesc = job.description || job.jobDescription || job.positionDescription || "";
      const jobLoc = job.location || job.jobLocation || "";
      const fullText = `${jobTitle} ${jobDesc} ${jobLoc}`.toLowerCase();

      // 1. Role match score (0-60)
      const roleScore = scoreRoleMatch(fullText, searchTerms, desiredRole);
      
      // 2. Experience level score (-50 to +35)
      const expScore = scoreExperience(fullText, userExpLevel);
      
      // 3. Location score (0-30)
      const locScore = scoreLocation(jobLoc, desiredLoc, isRemote);
      
      // 4. Work type score (-15 to +25)
      const workTypeScore = scoreWorkType(job, isRemote, userWorkType);
      
      // 5. Source recency bonus
      let recencyScore = 0;
      const postedDate = new Date(job.postedAt || job.datePosted || job.created_at || Date.now());
      const daysAgo = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo < 1) recencyScore = 10;
      else if (daysAgo < 3) recencyScore = 7;
      else if (daysAgo < 7) recencyScore = 5;
      else if (daysAgo < 14) recencyScore = 3;
      
      // Calculate total score
      let totalScore = roleScore + expScore + locScore + workTypeScore + recencyScore;
      
      // Boost for very strong matches
      if (roleScore >= 40 && expScore >= 20) totalScore += 15;
      if (roleScore >= 30 && locScore >= 20 && expScore >= 15) totalScore += 10;
      
      // Clamp to 0-100
      totalScore = Math.min(100, Math.max(0, totalScore));
      
      // Determine source label
      let source = "Adzuna";
      if (isArbeitnow) source = "Arbeitnow";
      else if (isApify) source = "Indeed";

      // Build proper Indeed URL
      let jobUrl = job.url || "#";
      if (isApify && jobUrl === "#" && job.id) {
        jobUrl = `https://www.indeed.com/viewjob?jk=${job.id}`;
      }

      return {
        id: isArbeitnow ? `arbeitnow_${job.slug}` : (isApify ? `indeed_${job.id}` : `adzuna_${job.id}`),
        title: jobTitle || "Unknown Role",
        company: job.company || job.companyName || job.hiringOrganization?.name || (isArbeitnow ? job.company_name : "Unknown"),
        location: jobLoc || "Unknown",
        description: stripHtml(jobDesc),
        url: jobUrl,
        salary: job.salary || job.salaryRange || job.salaryCurrency || null,
        remote: !!job.remote || (job.jobType && Array.isArray(job.jobType) && job.jobType.some((t: string) => t.toLowerCase().includes("remote"))) || fullText.includes("remote"),
        source,
        match_score: totalScore,
        score: totalScore,
        created_at: job.postedAt || job.datePosted || job.created_at || new Date().toISOString(),
        // Debug info attached to each job for transparency
        _debug: {
          roleScore,
          expScore,
          locScore,
          workTypeScore,
          recencyScore,
          detectedExp: detectExperienceLevel(fullText),
        }
      };
    });

    // Filter out severely mismatched jobs (optional - can be disabled)
    // Keep jobs with score > 0 OR that have decent role matching
    const filtered = mapped.filter((j: any) => {
      // Always keep if role score is decent
      if (j._debug.roleScore >= 20) return true;
      // Always keep if total score is positive
      if (j.score > 0) return true;
      // Keep if it's a strong location match
      if (j._debug.locScore >= 20) return true;
      return false;
    });

    const seen = new Set();
    const deduped = filtered.filter((j: any) => {
      if (seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });

    // Sort by score descending, then by date
    deduped.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const toUpsert = deduped.map((j: any) => ({
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
        rawLocation: profile.desired_location,
        parsedLocation: location,
        isRemote,
        userExpLevel,
        apifyCountry,
        adzunaSupported,
        isGerman,
        apifyConfigured: !!APIFY_API_TOKEN,
        adzunaConfigured: !!(ADZUNA_APP_ID && ADZUNA_APP_KEY),
        perSourceCounts: {
          apify: allJobs.filter((j: any) => j.positionName !== undefined || (j.id !== undefined && j.url !== undefined && j.company !== undefined)).length,
          adzuna: allJobs.filter((j: any) => j.id && !j.slug && !j.positionName && !(j.id !== undefined && j.url !== undefined && j.company !== undefined)).length,
          arbeitnow: allJobs.filter((j: any) => j.slug !== undefined).length,
        },
        scoreBreakdown: {
          avgScore: deduped.length > 0 ? Math.round(deduped.reduce((sum, j) => sum + j.score, 0) / deduped.length) : 0,
          highMatches: deduped.filter((j: any) => j.score >= 70).length,
          mediumMatches: deduped.filter((j: any) => j.score >= 40 && j.score < 70).length,
          lowMatches: deduped.filter((j: any) => j.score < 40).length,
        },
        errors,
        totalJobsFound: allJobs.length,
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

  if (jobs.length > 0) {
    console.log(`[Apify] First job fields:`, Object.keys(jobs[0]).join(", "));
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