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
  "ireland": "ie", "dublin": "ie", "cork": "ie", "galway": "ie",
  "limerick": "ie", "waterford": "ie",
  "switzerland": "ch", "zurich": "ch", "geneva": "ch",
  "poland": "pl", "warsaw": "pl",
  "portugal": "pt", "lisbon": "pt", "lisboa": "pt", "porto": "pt",
  "braga": "pt", "coimbra": "pt", "faro": "pt", "aveiro": "pt",
  "setubal": "pt", "leiria": "pt", "funchal": "pt",
  "sweden": "se", "stockholm": "se",
  "denmark": "dk", "copenhagen": "dk",
  "norway": "no", "oslo": "no",
  "finland": "fi", "helsinki": "fi",
};

// City to country mapping for location validation
const CITY_TO_COUNTRY: Record<string, string> = {
  "lisbon": "portugal", "porto": "portugal", "lisboa": "portugal",
  "braga": "portugal", "coimbra": "portugal", "faro": "portugal",
  "aveiro": "portugal", "setubal": "portugal", "leiria": "portugal",
  "funchal": "portugal",
  "madrid": "spain", "barcelona": "spain", "valencia": "spain",
  "rome": "italy", "milan": "italy", "milano": "italy", "turin": "italy", "torino": "italy",
  "naples": "italy", "napoli": "italy",
  "berlin": "germany", "munich": "germany", "munchen": "germany", "hamburg": "germany",
  "cologne": "germany", "koln": "germany", "frankfurt": "germany", "stuttgart": "germany",
  "paris": "france", "lyon": "france", "marseille": "france",
  "amsterdam": "netherlands", "rotterdam": "netherlands",
  "brussels": "belgium",
  "vienna": "austria", "wien": "austria",
  "dublin": "ireland", "cork": "ireland", "galway": "ireland",
  "limerick": "ireland", "waterford": "ireland",
  "zurich": "switzerland", "geneva": "switzerland",
  "warsaw": "poland",
  "stockholm": "sweden",
  "copenhagen": "denmark",
  "oslo": "norway",
  "helsinki": "finland",
  "london": "uk", "manchester": "uk", "birmingham": "uk",
  "toronto": "canada", "vancouver": "canada", "montreal": "canada",
  "new york": "usa", "san francisco": "usa", "los angeles": "usa", "chicago": "usa",
  "sydney": "australia", "melbourne": "australia",
  "tokyo": "japan", "osaka": "japan",
  "sao paulo": "brazil", "rio de janeiro": "brazil",
  "mexico city": "mexico",
  "buenos aires": "argentina",
};

// European countries used to validate "Europe" / "EU" / "EMEA" location preferences
const EU_COUNTRIES = [
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic", "czechia",
  "denmark", "estonia", "finland", "france", "germany", "greece", "hungary", "ireland",
  "italy", "latvia", "lithuania", "luxembourg", "malta", "netherlands", "poland",
  "portugal", "romania", "slovakia", "slovenia", "spain", "sweden",
  // Common non-EU European countries users usually include when saying "Europe"
  "uk", "united kingdom", "great britain", "england", "scotland", "wales", "northern ireland",
  "switzerland", "norway", "iceland", "liechtenstein", "serbia", "bosnia", "montenegro",
  "north macedonia", "albania", "ukraine", "moldova", "belarus", "russia",
];

// Portugal-headquartered or major Portugal employers to prioritise when the user
// searches for Portugal.
const PORTUGAL_COMPANIES = new Set([
  "Caixa Geral de Depositos", "Millennium BCP", "Novo Banco", "Banco BPI", "Montepio",
  "NOS", "MEO", "EDP", "Galp Energia", "REN", "Jeronimo Martins", "Sonae", "Delta Cafes",
  "BIAL", "Hovione", "Tecnimede", "Grifols", "OutSystems", "Talkdesk", "Feedzai",
  "Sword Health", "Unbabel", "Farfetch", "Landing.jobs", "Blip", "Mindera", "Celfocus",
  "Primavera BSS", "Glintt", "Softinsa", "Critical Software", "WIT Software", "SCC",
  "Tessi", "Noesis", "Devoteam", "Inetum", "everis", "anchor", "Dare", "Redlight",
  "NOWO", "Oni Telecom", "Mota-Engil", "Teixeira Duarte", "Soares da Costa", "Conduril",
  "Martifer", "Bosch", "Siemens", "Vodafone", "Ericsson", "Nokia"
].map(c => c.toLowerCase()));

// Major Ireland employers to prioritise when the user searches for Ireland.
const IRELAND_COMPANIES = new Set([
  "Stripe", "HubSpot", "Google", "Microsoft", "Amazon", "Apple", "Meta", "Twitter", "X",
  "LinkedIn", "TikTok", "Pfizer", "Intel", "Dell", "IBM", "Cisco", "Salesforce", "Workday",
  "Indeed", "Intercom", "Fenergo", "FINEOS", "Vilocys", "Poppulo", "Teamwork", "Keelvar",
  "Altada", "Clavis Insight", "PMD Solutions", "SoapBox Labs", "Nuritas", "LearnUpon",
  "Brightflag", "AssureHedge", "TransferMate", "Fexco", "Ding", "CarTrawler", "Hostelworld",
  "Ryanair", "Aer Lingus", "Kingspan", "CRH", "Musgrave", "Greencore", "Glanbia", "Kerry Group",
  "Smurfit Kappa", "Paddy Power Betfair", "Flutter Entertainment", "DraftKings",
  "Keywords Studios", "Digit Game Studios", "Romero Games", "Demonware", "Havok",
  "Nine Lives Media", "StoryToys", "Sugru", "Cubic Telecom", "Snap", "Shopify", "Zalando",
  "Personio", "Contentful", "HelloFresh", "N26", "Klarna", "Revolut", "Bunq", "Monzo", "Wise",
  "MongoDB", "Datadog", "Twilio", "Elastic", "Cloudflare", "Dropbox", "Spotify", "Netflix",
  "Uber", "Airbnb", "Booking.com", "SAP", "Oracle", "VMware", "Red Hat", "Fastly",
  "JPMorgan Chase", "Goldman Sachs", "Morgan Stanley", "Bank of America", "Citigroup",
  "HSBC", "Barclays", "AIB", "Bank of Ireland", "Ulster Bank", "Permanent TSB"
].map(c => c.toLowerCase()));

// ============================================================================
// STRICT LOCATION FILTER - Only allows user\'s desired locations
// ============================================================================
function isLocationAllowed(location: string, profile?: any): boolean {
  if (!location) return true;
  const locLower = location.toLowerCase().trim();

  const userDesiredLocs = (profile?.desired_location || "").toLowerCase().trim();
  if (!userDesiredLocs) return true;

  const userLocs = userDesiredLocs.split(/[,;]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  if (userLocs.length === 0) return true;

  // Always allow worldwide/global
  if (locLower.includes("worldwide") || locLower.includes("global") || locLower.includes("anywhere")) {
    return true;
  }

  // Build allowed terms from user preferences + city mappings
  const allowedTerms = new Set<string>();
  for (const loc of userLocs) {
    allowedTerms.add(loc);
    if (CITY_TO_COUNTRY[loc]) allowedTerms.add(CITY_TO_COUNTRY[loc]);
  }

  const userWantsEu = userLocs.some((l: string) => l.includes("eu") || l.includes("europe") || l.includes("emea"));

  // Check if location directly mentions an allowed term
  for (const term of allowedTerms) {
    if (locLower.includes(term)) return true;
  }

  // If user wants Europe/EU/EMEA, allow any specific European country location
  if (userWantsEu) {
    for (const country of EU_COUNTRIES) {
      if (locLower.includes(country)) return true;
    }
  }

  // For remote jobs: if they specify a country, that country MUST be allowed
  const isRemoteJob = locLower.includes("remote") || locLower.includes("work from home") || locLower.includes("wfh");
  if (isRemoteJob) {
    // Countries to check against: all countries we know about, plus European countries when user wants Europe
    const checkCountries = userWantsEu
      ? [...new Set([...Object.values(CITY_TO_COUNTRY), ...EU_COUNTRIES])]
      : [...new Set(Object.values(CITY_TO_COUNTRY))];

    let specifiesNonAllowedCountry = false;
    for (const c of checkCountries) {
      if (locLower.includes(c) && !allowedTerms.has(c)) {
        specifiesNonAllowedCountry = true;
        break;
      }
    }

    // If it specifies a non-allowed country, reject it immediately
    if (specifiesNonAllowedCountry) return false;

    // If user explicitly wants remote, allow generic remote
    const userWantsRemote = userLocs.includes("remote");
    if (userWantsRemote) return true;

    // If user wants EU and job is generic EU remote, allow
    if (userWantsEu && (locLower.includes("eu") || locLower.includes("europe") || locLower.includes("emea"))) {
      return true;
    }

    // Generic remote without country specified - reject if user has specific countries
    // (they said Portugal/Spain/Italy, not "remote")
    return false;
  }

  // Check EU/Europe/EMEA if user wants it
  if (userWantsEu && (locLower.includes("eu") || locLower.includes("europe") || locLower.includes("emea"))) {
    return true;
  }

  return false;
}

function getLocationPenalty(location: string, profile?: any): number {
  if (isLocationAllowed(location, profile)) return 0;
  return -50;
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>|<\/h[1-6]>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
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
// WEIGHTED JOB MATCHING ENGINE
// ============================================================================
//
// Final score = weighted sum of independent 0-1 components:
//   roleMatch      * 0.30
//   workTypeMatch  * 0.20
//   locationMatch  * 0.20
//   experienceMatch* 0.10
//   salaryMatch    * 0.10
//   industryMatch  * 0.05
//   jobTypeMatch   * 0.05
// multiplied by 100, with small recency bonus and language penalties.

// Expand a role with common synonyms and related terms so custom/typed roles
// still match relevant job titles.
function expandRoleTerms(role: string): string[] {
  const terms = new Set<string>();
  const lower = role.toLowerCase().trim();
  if (lower.length < 2) return [];

  terms.add(lower);

  // Drop common filler words and keep the keyword form
  const keywordForm = lower
    .replace(/\b(analyst|specialist|officer|manager|engineer|developer|representative|coordinator|associate)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (keywordForm && keywordForm !== lower && keywordForm.length >= 2) {
    terms.add(keywordForm);
  }

  // Engineer / Developer equivalence
  if (/\bengineer\b/.test(lower)) {
    terms.add(lower.replace(/\bengineer\b/g, "developer"));
  }
  if (/\bdeveloper\b/.test(lower)) {
    terms.add(lower.replace(/\bdeveloper\b/g, "engineer"));
  }

  // Support family
  if (lower.includes("customer support") || lower.includes("technical support")) {
    terms.add("support");
    terms.add("customer service");
  }
  if (lower.includes("support")) {
    terms.add("customer support");
  }

  // Trust & Safety / Content Moderation / Safety
  if (lower.includes("trust") || lower.includes("safety")) {
    terms.add("trust & safety");
    terms.add("trust and safety");
    terms.add("content moderator");
    terms.add("content moderation");
    terms.add("safety");
  }
  if (lower.includes("content moderator") || lower.includes("content moderation")) {
    terms.add("trust & safety");
    terms.add("trust and safety");
  }

  // Risk family
  if (lower.includes("risk")) {
    terms.add("risk analyst");
    terms.add("risk specialist");
    terms.add("risk manager");
  }

  // Compliance family
  if (lower.includes("compliance")) {
    terms.add("compliance");
    terms.add("regulatory");
    terms.add("compliance analyst");
  }

  // KYC / AML / Fraud family
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

  // Manager / Management
  if (/\bmanager\b/.test(lower)) {
    terms.add(lower.replace(/\bmanager\b/g, "management"));
  }

  // QA / Quality Assurance
  if (/\bqa\b/.test(lower)) {
    terms.add(lower.replace(/\bqa\b/g, "quality assurance"));
  }

  // Implementation / Project / Business Analyst bridges
  if (lower.includes("implementation")) {
    terms.add("implementation");
    terms.add("project");
  }
  if (lower.includes("business analyst")) {
    terms.add("business analysis");
    terms.add("analyst");
  }

  return Array.from(terms);
}

function scoreRoleMatch(jobTitle: string, jobDesc: string, desiredRoles: string[]): number {
  const title = jobTitle.toLowerCase();
  const desc = jobDesc.toLowerCase();
  let bestScore = 0;

  for (const role of desiredRoles) {
    const expandedTerms = expandRoleTerms(role);
    let roleBestScore = 0;

    for (const term of expandedTerms) {
      const termLower = term.toLowerCase().trim();
      if (termLower.length < 2) continue;

      // Full term appears in title (best signal)
      if (title.includes(termLower)) {
        roleBestScore = Math.max(roleBestScore, 1.0);
        continue;
      }

      // All significant words appear in title
      const roleWords = termLower.split(/\s+/).filter((w: string) => w.length >= 3);
      if (roleWords.length > 0) {
        const matchedWords = roleWords.filter(w => title.includes(w)).length;
        if (matchedWords === roleWords.length) {
          roleBestScore = Math.max(roleBestScore, 0.85);
        } else if (matchedWords >= 2) {
          roleBestScore = Math.max(roleBestScore, 0.55 + (matchedWords / roleWords.length) * 0.2);
        } else if (matchedWords === 1) {
          roleBestScore = Math.max(roleBestScore, 0.35);
        }
      }

      // Full term appears in description
      if (desc.includes(termLower)) {
        roleBestScore = Math.max(roleBestScore, 0.55);
      } else if (roleWords.length > 0) {
        const descMatched = roleWords.filter(w => desc.includes(w)).length;
        if (descMatched >= 2) {
          roleBestScore = Math.max(roleBestScore, 0.35);
        } else if (descMatched === 1) {
          roleBestScore = Math.max(roleBestScore, 0.2);
        }
      }
    }

    bestScore = Math.max(bestScore, roleBestScore);
  }

  return bestScore;
}

function detectWorkType(job: any): "remote" | "hybrid" | "onsite" | "unknown" {
  const text = `${job.title || ""} ${job.description || ""} ${job.location || ""} ${job.work_type || ""}`.toLowerCase();
  if (text.includes("remote") || text.includes("work from home") || text.includes("wfh") || text.includes("home office") || text.includes("anywhere")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("on-site") || text.includes("onsite") || text.includes("in office") || text.includes("in-office") || text.includes("on site")) return "onsite";
  return "unknown";
}

function scoreWorkType(job: any, userWorkType: string): number {
  const jobWT = detectWorkType(job);
  const userWT = (userWorkType || "").toLowerCase();

  if (!userWT || userWT === "any") {
    return jobWT === "unknown" ? 0.75 : 0.85;
  }

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
  if (!desiredLoc || desiredLoc.trim() === "") return 0.75;
  if (!jobLoc) return 0.0;

  const jobLower = jobLoc.toLowerCase();
  const desiredLower = desiredLoc.toLowerCase();
  const desiredLocs = desiredLower.split(/[,;\s]+/).filter((s: string) => s.length > 2);

  // Remote is a valid work-type preference, not a location, but we still allow
  // generic remote postings to score well when the user wants remote.
  const userWantsRemote = desiredLower.includes("remote") || desiredLower.includes("anywhere") || desiredLower.includes("global");

  for (const loc of desiredLocs) {
    // Direct match in job location
    if (jobLower.includes(loc)) return 1.0;

    // Desired city maps to a country that appears in job location
    const cityCountry = CITY_TO_COUNTRY[loc];
    if (cityCountry && jobLower.includes(cityCountry)) return 1.0;

    // Job location is a known city whose country matches desired location
    for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
      if (jobLower.includes(city) && (loc === country || country.includes(loc))) return 1.0;
    }
  }

  // Europe / EU / EMEA region match
  if (desiredLower.includes("europe") || desiredLower.includes("eu") || desiredLower.includes("emea")) {
    if (EU_COUNTRIES.some(c => jobLower.includes(c))) return 0.8;
  }

  // Remote jobs satisfy remote preference
  if (userWantsRemote && (jobLower.includes("remote") || jobLower.includes("anywhere") || jobLower.includes("global"))) {
    return 0.9;
  }

  return 0.0;
}

function scoreExperienceLevel(jobTitle: string, jobDesc: string, userLevel: string): number {
  const text = `${jobTitle} ${jobDesc}`.toLowerCase();
  const userLevelLower = (userLevel || "").toLowerCase().trim();

  if (!userLevelLower || userLevelLower === "any") return 0.75;

  const hasSenior = /\b(senior|sr\.?|lead|principal|staff|head of|director|vp|vice president|chief|architect|5\+ years|6\+ years|7\+ years|8\+ years|10\+ years)\b/i.test(text);
  const hasMid = /\b(mid|mid-level|intermediate|2-5 years|3\+ years|4\+ years|level 2|level ii)\b/i.test(text);
  const hasEntry = /\b(entry|entry-level|junior|jr\.?|graduate|grad|intern|trainee|0-2|1-2|1\+ years|no experience|early career|fresh|associate i?)\b/i.test(text);

  if (userLevelLower.includes("entry") || userLevelLower.includes("junior") || userLevelLower.includes("grad") || userLevelLower.includes("intern")) {
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

function parseSalaryToMonthly(salaryStr: string): { min: number; max: number } | null {
  if (!salaryStr || salaryStr.toLowerCase().includes("not specified") || salaryStr.toLowerCase().includes("competitive")) return null;

  const matches = salaryStr.match(/\d[\d\s,]*(?:k)?/gi);
  if (!matches || matches.length === 0) return null;

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

  // Heuristic: values >= 10,000 are treated as annual and converted to monthly.
  if (avg >= 10000) {
    min /= 12;
    max /= 12;
  }

  return { min, max };
}

function scoreSalary(jobSalary: string | number | null, profile: any): number {
  const profileMin = profile.desired_salary_min;
  const profileMax = profile.desired_salary_max;

  if ((profileMin === undefined || profileMin === null || profileMin === "") &&
      (profileMax === undefined || profileMax === null || profileMax === "")) {
    return 0.75;
  }

  const parsed = parseSalaryToMonthly(String(jobSalary || ""));
  if (!parsed) return 0.65;

  const pMin = Number(profileMin) || 0;
  const pMax = Number(profileMax) || Infinity;

  // Normalize profile if it looks annual (>= 10,000)
  const profileAvg = pMin + (pMax === Infinity ? pMin : pMax);
  const isAnnual = profileAvg >= 20000;
  const normProfileMin = isAnnual ? pMin / 12 : pMin;
  const normProfileMax = pMax === Infinity ? Infinity : (isAnnual ? pMax / 12 : pMax);

  // Overlap
  if (parsed.max >= normProfileMin && parsed.min <= normProfileMax) return 1.0;

  // Job salary above desired range
  if (parsed.min > normProfileMax && normProfileMax !== Infinity) {
    return Math.max(0, (normProfileMax / parsed.min) * 0.6);
  }

  // Job salary below desired range
  if (parsed.max < normProfileMin) {
    return Math.max(0, (parsed.max / normProfileMin) * 0.6);
  }

  return 0.5;
}

function getProfileIndustries(profile: any): string[] {
  const val = profile.industries || "";
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s: string) => s.toLowerCase().trim());
  return val.split(/[,;]/).map((s: string) => s.toLowerCase().trim()).filter(Boolean);
}

function scoreIndustry(jobSector: string | undefined, profile: any): number {
  const industries = getProfileIndustries(profile);
  if (industries.length === 0) return 0.75;

  const sector = (jobSector || "").toLowerCase();

  const sectorToIndustry: Record<string, string[]> = {
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
    "real estate": ["real estate", "property"],
    gaming: ["gaming", "technology", "entertainment"],
    crypto: ["crypto", "fintech", "technology"],
    food: ["food", "retail", "consumer goods"],
    construction: ["construction", "engineering", "real estate"],
    engineering: ["engineering", "manufacturing", "technology"],
    manufacturing: ["manufacturing", "engineering"],
    chemicals: ["chemicals", "manufacturing"],
    media: ["media", "entertainment", "technology"],
    transportation: ["transportation", "logistics"],
    logistics: ["logistics", "transportation", "supply chain"],
  };

  for (const ind of industries) {
    if (sector === ind) return 1.0;
    const related = sectorToIndustry[sector] || [];
    if (related.includes(ind)) return 0.85;
  }

  return 0.0;
}

function scoreJobType(jobType: string | undefined, profile: any): number {
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

function scoreRecency(job: any): number {
  const posted = new Date(job.postedAt || job.datePosted || job.created_at || Date.now());
  const days = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1) return 3;
  if (days < 3) return 2;
  if (days < 7) return 1;
  return 0;
}

// ============================================================================
// LANGUAGE SCORING
// ============================================================================

function scoreLanguage(jobTitle: string, jobDesc: string, userLanguages: string[]): { score: number; missing: string[] } {
  if (!userLanguages || userLanguages.length === 0) return { score: 0, missing: [] };

  const fullText = `${jobTitle} ${jobDesc}`.toLowerCase();
  const userLangsLower = userLanguages.map((l: string) => l.toLowerCase());

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
      penalty -= 25;
      missingLanguages.push(lang);
    }
  }

  return { score: Math.max(-60, penalty), missing: missingLanguages };
}

// ============================================================================
// FINAL WEIGHTED SCORE CALCULATION
// ============================================================================

function calculateMatchScore(job: any, profile: any): { score: number; reasons: string[] } {
  const title = job.title || job.positionName || job.role || "";
  const desc = job.description || job.jobDescription || "";
  const jobLoc = job.location || job.jobLocation || "";

  const desiredRoles = getSearchTerms(profile);
  const userExpLevel = String(profile.experience_level || "").toLowerCase().trim();
  const desiredLoc = (profile.desired_location || "").toLowerCase();
  const userWorkType = profile.work_type || "";
  const userLanguages = profile.languages || [];

  const reasons: string[] = [];

  const roleScore = scoreRoleMatch(title, desc, desiredRoles);
  const workTypeScore = scoreWorkType(job, userWorkType);
  const locationScore = scoreLocation(jobLoc, desiredLoc);
  const experienceScore = scoreExperienceLevel(title, desc, userExpLevel);
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

  if (roleScore >= 0.9) reasons.push("Strong role match");
  else if (roleScore >= 0.6) reasons.push("Good role match");
  else if (roleScore >= 0.35) reasons.push("Partial role match");

  if (workTypeScore >= 0.9) reasons.push("Matches work type preference");
  else if (workTypeScore <= 0.2) reasons.push("Work type mismatch");

  if (locationScore >= 0.9) reasons.push("Great location match");
  else if (locationScore >= 0.6) reasons.push("Location OK");
  else if (locationScore === 0) reasons.push("Location mismatch");

  if (experienceScore >= 0.8) reasons.push("Matches experience level");
  else if (experienceScore <= 0.2) reasons.push("Experience level mismatch");

  if (salaryScore >= 0.9) reasons.push("Salary in range");

  if (industryScore >= 0.8) reasons.push("Industry match");

  if (jobTypeScore >= 0.9) reasons.push("Job type match");

  // Penalise badly mismatched work type so wrong-type jobs never rank high
  if (workTypeScore < 0.25) {
    score -= 30;
    if (!reasons.includes("Work type mismatch")) reasons.push("Work type mismatch");
  }

  // Penalise badly mismatched experience level for entry seekers
  if (userExpLevel.includes("entry") && experienceScore < 0.25) {
    score -= 25;
  }

  // Small recency bonus
  const recencyScore = scoreRecency(job);
  score += recencyScore;

  // Language penalty
  const langResult = scoreLanguage(title, desc, userLanguages);
  score += langResult.score;
  if (langResult.missing.length > 0) {
    reasons.push(`Requires ${langResult.missing.join(", ")}`);
  }

  // Location whitelist hard guard
  const locPenalty = getLocationPenalty(jobLoc, profile);
  score += locPenalty;
  if (locPenalty < 0) reasons.push("Location outside preferred regions");

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, reasons };
}

// ============================================================================
// COMPANY JOBS FETCHER (PRIMARY SOURCE) - BROAD QUERY
// ============================================================================
async function fetchCompanyJobs(searchTerms: string[], location: string, isRemote: boolean, profile: any, limit: number = 500) {
  console.log(`[CompanyJobs] BROAD SEARCH: fetching up to ${limit} company jobs, then scoring against: ${searchTerms.join(", ")}`);

  // Build ILIKE conditions for title matching (for priority ordering)
  const titleConditions = searchTerms.map(term => {
    const cleanTerm = term.replace(/[%_]/g, "\\$&");
    return `role.ilike.%${cleanTerm}%`;
  }).join(",");

  // Also match company name
  const companyConditions = searchTerms.map(term => {
    const cleanTerm = term.replace(/[%_]/g, "\\$&");
    return `company.ilike.%${cleanTerm}%`;
  }).join(",");

  // Location handling - location is space-separated list of countries
  const locParts = location.toLowerCase().split(/\s+/).filter((s: string) => s.length > 0);
  const locLower = locParts.join(" ");
  let locationQuery: string | null = null;

  if (locLower && !locLower.includes("europe") && !locLower.includes("eu") && !locLower.includes("anywhere") && !locLower.includes("global")) {
    const locConditions = locParts.map((term: string) => `location.ilike.%${term}%`).join(",");
    // Only include remote in query if user wants remote
    if (isRemote) {
      locationQuery = `${locConditions},location.ilike.%remote%`;
    } else {
      locationQuery = locConditions;
    }
  }

  // Query 1: Try to get matching jobs first (prioritized)
  let matchingJobs: any[] = [];
  try {
    let query1 = supabase
      .from("jobs")
      .select("*")
      .or(`source.eq.company_careers_greenhouse,source.eq.company_careers_lever,source.eq.company_careers_unknown`)
      .or(titleConditions)
      .limit(Math.floor(limit * 0.6));

    if (locationQuery) {
      query1 = query1.or(locationQuery);
    }

    const { data: data1, error: error1 } = await query1;
    if (!error1 && data1) matchingJobs = data1;
  } catch (e) {
    console.error("[CompanyJobs] Priority query failed:", e);
  }

  // Query 2: Get ALL remaining company jobs (the broad sweep) - also constrained by location
  let allJobs: any[] = [];
  try {
    let query2 = supabase
      .from("jobs")
      .select("*")
      .or(`source.eq.company_careers_greenhouse,source.eq.company_careers_lever,source.eq.company_careers_unknown`)
      .limit(limit);

    if (locationQuery) {
      query2 = query2.or(locationQuery);
    }

    const { data: data2, error: error2 } = await query2;
    if (!error2 && data2) allJobs = data2;
  } catch (e) {
    console.error("[CompanyJobs] Broad query failed:", e);
  }

  // Merge: matching jobs first, then the rest - STRICT location filter using profile
  const seenIds = new Set<string>();
  const merged: any[] = [];

  for (const job of matchingJobs) {
    if (!seenIds.has(job.id) && isLocationAllowed(job.location, profile)) {
      seenIds.add(job.id);
      merged.push({ ...job, _priority: 1 });
    }
  }

  for (const job of allJobs) {
    if (!seenIds.has(job.id) && isLocationAllowed(job.location, profile)) {
      seenIds.add(job.id);
      merged.push({ ...job, _priority: 0 });
    }
  }

  console.log(`[CompanyJobs] Found ${merged.length} total company jobs (priority matches: ${matchingJobs.length})`);

  // Normalize company jobs to unified format
  return merged.map((job: any) => ({
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
    _priority: job._priority || 0,
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
    // Default to "europe" so the Europe results page shows a broad range of
    // companies and locations rather than only remote postings.
    const safeProfile = rawProfile || {};
    const effectiveProfile = {
      desired_role: safeProfile.desired_role || "software engineer",
      desired_location: safeProfile.desired_location || "europe",
      work_type: safeProfile.work_type || "remote",
      experience_level: String(safeProfile.experience_level || "mid"),
      languages: Array.isArray(safeProfile.languages) ? safeProfile.languages : [],
      id: safeProfile.id || userId,
      ...safeProfile
    };

    const searchTerms = getSearchTerms(effectiveProfile);
    const rawLocation = (effectiveProfile.desired_location || "").toLowerCase().trim();
    const isRemote = rawLocation.includes("remote") || (effectiveProfile.work_type || "").toLowerCase() === "remote";
    const locationParts = (rawLocation.split(/[,;]/) as string[]).map((l: string) => l.trim()).filter((s: string) => s.length > 0);
    const location = locationParts.filter((l: string) => l !== "remote").join(" ");

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
      const companyJobs = await fetchCompanyJobs(searchTerms, location, isRemote, effectiveProfile, 200);
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
    // STEP 4: APIFY/INDEED (LAST RESORT FALLBACK - paid, skip if no token)
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

    // Apply strict location whitelist first
    let afterLocation = scored.filter((j: any) => isLocationAllowed(j.location, effectiveProfile));

    // Dedupe by URL before filtering on score so we keep the best duplicate
    const seenJobUrls = new Set();
    const deduped = afterLocation.filter((j: any) => {
      if (seenJobUrls.has(j.url)) return false;
      seenJobUrls.add(j.url);
      return true;
    });

    // Primary filter: drop obviously irrelevant jobs (score < 25)
    let filtered = deduped.filter((j: any) => j.score >= 25);
    let relaxedFilters = false;

    // If we have very few strong matches (< 5 jobs at 40%+), relax to show
    // the closest results but mark the response accordingly.
    if (filtered.filter((j: any) => j.score >= 40).length < 5) {
      filtered = deduped.filter((j: any) => j.score >= 15);
      relaxedFilters = true;
    }

    filtered.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // ============================================================================
    // SAVE TO USER\'S JOBS TABLE (only non-company jobs, or update if needed)
    // ============================================================================
    const toUpsert = filtered
      .filter((j: any) => !j.id.startsWith("company_")) // Don\'t re-save company jobs that are already in DB
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
      jobs: filtered.slice(0, 50),
      count: filtered.length,
      source: primarySource,
      sourcesUsed,
      searchTerms,
      location: location || "any",
      isRemote,
      relaxedFilters,
      debug: process.env.NODE_ENV === "development" ? {
        rawLocation: effectiveProfile.desired_location,
        parsedLocation: location,
        locationParts: locationParts,
        isRemote,
        userExpLevel: effectiveProfile.experience_level,
        userLanguages: effectiveProfile.languages || [],
        apifyCountry,
        adzunaSupported,
        isGerman,
        apifyConfigured: !!APIFY_API_TOKEN,
        adzunaConfigured: !!(ADZUNA_APP_ID && ADZUNA_APP_KEY),
        scoreDistribution: {
          excellent: filtered.filter((j: any) => j.score >= 80).length,
          good: filtered.filter((j: any) => j.score >= 60 && j.score < 80).length,
          decent: filtered.filter((j: any) => j.score >= 40 && j.score < 60).length,
          low: filtered.filter((j: any) => j.score >= 20 && j.score < 40).length,
          filtered: scored.length - filtered.length,
        },
        errors,
        totalJobsFound: allJobs.length,
        jobsAfterScoring: scored.length,
        jobsAfterFilter: filtered.length,
        jobsAfterDedup: deduped.length,
      } : undefined
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