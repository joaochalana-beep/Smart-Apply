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

// Apify country codes for Indeed
const APIFY_COUNTRIES: Record<string, string> = {
  "portugal": "pt", "lisbon": "pt", "lisboa": "pt", "porto": "pt",
  "spain": "es", "madrid": "es", "barcelona": "es", "valencia": "es",
  "germany": "de", "france": "fr", "uk": "gb", "ireland": "ie",
  "italy": "it", "netherlands": "nl", "belgium": "be", "austria": "at",
  "switzerland": "ch", "sweden": "se", "denmark": "dk", "norway": "no",
  "finland": "fi", "poland": "pl", "czech republic": "cz", "greece": "gr",
  "brazil": "br", "mexico": "mx", "argentina": "ar", "australia": "au",
  "new zealand": "nz", "japan": "jp", "canada": "ca", "usa": "us", "united states": "us",
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
    // Priority 1: Apify-supported countries (Portugal, Brazil, etc.) -> Apify Indeed
    // Priority 2: Adzuna-supported countries (UK, Germany, etc.) -> Adzuna
    // Priority 3: German/generic -> Arbeitnow
    // Priority 4: Fallback chain
    // ========================================================================

    if (apifyCountry && APIFY_API_TOKEN) {
      // ======================================================================
      // STRATEGY A: Apify country -> Indeed scraping (Portugal, Brazil, etc.)
      // ======================================================================
      primarySource = "apify_indeed";
      try {
        const apifyJobs = await fetchApifyIndeed(searchTerms, location, isRemote, apifyCountry);
        allJobs = apifyJobs;
        sourcesUsed.push("apify_indeed");
        console.log(`[Discover] Apify Indeed returned ${apifyJobs.length} jobs for ${apifyCountry}`);
      } catch (err: any) {
        errors["apify_indeed"] = err.message;
        console.error("[Discover] Apify Indeed failed:", err.message);
      }

      // Supplement with Adzuna for remote jobs
      if (allJobs.length === 0 || isRemote) {
        if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
          try {
            const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
            const newJobs = adzunaJobs.filter((aj: any) => !allJobs.some((j: any) => j.url === aj.url));
            allJobs = [...allJobs, ...newJobs];
            sourcesUsed.push("adzuna");
            console.log(`[Discover] Adzuna supplement added ${newJobs.length} jobs`);
          } catch (err: any) {
            errors["adzuna"] = err.message;
          }
        }
      }

      // Supplement with Arbeitnow for EU remote jobs
      if (isRemote && allJobs.length < 20) {
        try {
          const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, true);
          const newJobs = arbeitnowJobs.filter((aj: any) => !allJobs.some((j: any) => j.url === aj.url));
          allJobs = [...allJobs, ...newJobs];
          sourcesUsed.push("arbeitnow");
          console.log(`[Discover] Arbeitnow supplement added ${newJobs.length} jobs`);
        } catch (err: any) {
          errors["arbeitnow"] = err.message;
        }
      }

    } else if (adzunaSupported) {
      // ======================================================================
      // STRATEGY B: Adzuna-supported country -> Adzuna primary
      // ======================================================================
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
      // ======================================================================
      // STRATEGY C: German/generic -> Arbeitnow primary
      // ======================================================================
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
      // ======================================================================
      // STRATEGY D: Unknown location -> Try all sources
      // ======================================================================
      if (APIFY_API_TOKEN) {
        try {
          const apifyJobs = await fetchApifyIndeed(searchTerms, location, isRemote, "gb");
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
    // PROCESS & STORE RESULTS
    // ========================================================================
    const desiredLoc = (profile.desired_location || "").toLowerCase();
    
    const mapped = allJobs.map((job: any) => {
      const isArbeitnow = job.slug !== undefined;
      const isApify = job.positionName !== undefined || job.indeedId !== undefined;
      const jobText = `${job.title || job.positionName || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();

      let score = 0;
      for (const term of searchTerms) {
        const t = term.toLowerCase();
        if (jobText.includes(t)) score += 10;
      }

      const jobLoc = (job.location || "").toLowerCase();
      if (desiredLoc && !desiredLoc.includes("remote") && !desiredLoc.includes("europe") && !desiredLoc.includes("eu")) {
        if (jobLoc.includes(desiredLoc) || desiredLoc.includes(jobLoc)) score += 25;
      }
      if (isRemote && (job.remote || jobText.includes("remote") || jobText.includes("home office") || jobText.includes("homeoffice"))) {
        score += 20;
      }

      let source = "Adzuna";
      if (isArbeitnow) source = "Arbeitnow";
      else if (isApify) source = "Indeed";

      return {
        id: isArbeitnow ? `arbeitnow_${job.slug}` : (isApify ? `indeed_${job.indeedId || job.id}` : `adzuna_${job.id}`),
        title: job.title || job.positionName || "Unknown Role",
        company: job.company || job.companyName || (isArbeitnow ? job.company_name : "Unknown"),
        location: job.location || job.jobLocation || "Unknown",
        description: stripHtml(job.description || job.jobDescription || ""),
        url: job.url || job.applyUrl || "#",
        salary: job.salary || job.salaryRange || null,
        remote: !!job.remote || jobText.includes("remote"),
        source,
        match_score: Math.min(100, Math.max(0, score)),
        score,
        created_at: job.created_at || job.datePosted || new Date().toISOString(),
      };
    });

    const seen = new Set();
    const deduped = mapped.filter((j: any) => {
      if (seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });

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
        apifyCountry,
        adzunaSupported,
        isGerman,
        apifyConfigured: !!APIFY_API_TOKEN,
        adzunaConfigured: !!(ADZUNA_APP_ID && ADZUNA_APP_KEY),
        perSourceCounts: {
          apify: allJobs.filter((j: any) => j.positionName !== undefined).length,
          adzuna: allJobs.filter((j: any) => j.id && !j.slug && !j.positionName).length,
          arbeitnow: allJobs.filter((j: any) => j.slug !== undefined).length,
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
async function fetchApifyIndeed(searchTerms: string[], location: string, isRemote: boolean, country: string) {
  if (!APIFY_API_TOKEN || !APIFY_INDEED_ACTOR_ID) {
    throw new Error("Apify not configured");
  }

  const query = searchTerms.join(" ");
  const loc = location || (isRemote ? "Remote" : "");

  // Start Apify actor run
  const startUrl = `https://api.apify.com/v2/acts/${APIFY_INDEED_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`;
  
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      position: query,
      location: loc,
      country: country,
      maxJobCount: 50,
      parseCompanyDetails: false,
      saveOnlyUniqueItems: true,
    }),
  });

  if (!startRes.ok) {
    const errorText = await startRes.text();
    throw new Error(`Apify start failed: ${startRes.status} - ${errorText.slice(0, 200)}`);
  }

  const startData = await startRes.json();
  const runId = startData.data.id;
  const datasetId = startData.data.defaultDatasetId;

  console.log(`[Apify] Started run ${runId}, waiting for results...`);

  // Poll for completion (max 60 seconds)
  const maxWait = 60;
  const pollInterval = 3;
  let waited = 0;

  while (waited < maxWait) {
    await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
    waited += pollInterval;

    const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();

    console.log(`[Apify] Run status: ${statusData.data.status} (${waited}s)`);

    if (statusData.data.status === "SUCCEEDED") {
      break;
    }
    if (statusData.data.status === "FAILED" || statusData.data.status === "ABORTED") {
      throw new Error(`Apify run failed: ${statusData.data.status}`);
    }
  }

  // Fetch results from dataset
  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`;
  const resultsRes = await fetch(datasetUrl);
  
  if (!resultsRes.ok) {
    throw new Error(`Apify dataset fetch failed: ${resultsRes.status}`);
  }

  const jobs = await resultsRes.json();
  console.log(`[Apify] Retrieved ${jobs.length} jobs from dataset`);

  // Normalize Apify output format
  return jobs.map((job: any) => ({
    indeedId: job.id || job.jobKey,
    title: job.positionName || job.title,
    company: job.company || job.companyName,
    location: job.location || job.jobLocation || "Portugal",
    description: job.description || job.jobDescription || "View on Indeed for full description",
    url: job.url || `https://www.indeed.com/viewjob?jk=${job.id}`,
    salary: job.salary || job.salaryRange || null,
    remote: job.jobType?.includes("Remote") || false,
    created_at: job.datePosted || new Date().toISOString(),
  }));
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