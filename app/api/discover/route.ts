import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

const ADZUNA_SUPPORTED = new Set(["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za"]);
const ADZUNA_EU_COUNTRIES = ["gb", "de", "fr", "es", "nl", "it", "at", "be", "ch", "pl"];

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

function isUnsupportedLocation(loc: string): boolean {
  const unsupported = ["portugal", "lisbon", "lisboa", "porto", "prague", "athens", "budapest", "bucharest", "sofia", "zagreb", "ljubljana", "bratislava", "tallinn", "riga", "vilnius"];
  return unsupported.some(c => loc.toLowerCase().includes(c));
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

    let allJobs: any[] = [];
    let primarySource = "";
    let fallbackUsed = false;
    const useArbeitnowPrimary = isGermanOrGenericLocation(location) || isUnsupportedLocation(rawLocation);

    let adzunaError = null;
    let arbeitnowError = null;

    if (useArbeitnowPrimary) {
      primarySource = "arbeitnow";
      try {
        const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, isUnsupportedLocation(rawLocation));
        allJobs = arbeitnowJobs;
      } catch (err: any) {
        arbeitnowError = err.message;
        console.error("[Discover] Arbeitnow failed:", err.message);
        if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
          try {
            const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
            allJobs = adzunaJobs;
            primarySource = "adzuna";
            fallbackUsed = true;
          } catch (adzunaErr: any) {
            adzunaError = adzunaErr.message;
            return NextResponse.json({
              error: "Both job sources failed",
              details: `Arbeitnow: ${err.message}, Adzuna: ${adzunaErr.message}`,
            }, { status: 502 });
          }
        } else {
          return NextResponse.json({
            error: "Arbeitnow failed and no Adzuna fallback configured",
            details: err.message,
          }, { status: 502 });
        }
      }
    } else {
      if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
        primarySource = "adzuna";
        try {
          const adzunaJobs = await fetchAdzunaMultiCountry(searchTerms, location, isRemote);
          allJobs = adzunaJobs;
          console.log(`[Discover] Adzuna multi-country returned ${allJobs.length} jobs`);
        } catch (err: any) {
          adzunaError = err.message;
          console.error("[Discover] Adzuna failed:", err.message);
          try {
            const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, false);
            allJobs = arbeitnowJobs;
            primarySource = "arbeitnow";
            fallbackUsed = true;
          } catch (arbeitnowErr: any) {
            arbeitnowError = arbeitnowErr.message;
            return NextResponse.json({
              error: "Both job sources failed",
              details: `Adzuna: ${err.message}, Arbeitnow: ${arbeitnowErr.message}`,
            }, { status: 502 });
          }
        }
      } else {
        primarySource = "arbeitnow";
        try {
          const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote, false);
          allJobs = arbeitnowJobs;
        } catch (err: any) {
          arbeitnowError = err.message;
          return NextResponse.json({
            error: "No Adzuna credentials configured and Arbeitnow failed",
            details: err.message,
          }, { status: 502 });
        }
      }
    }

    if (isUnsupportedLocation(rawLocation) && isRemote) {
      const beforeFilter = allJobs.length;
      allJobs = allJobs.filter((job: any) => {
        const jobText = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();
        return job.remote === true || 
               jobText.includes("remote") || 
               jobText.includes("home office") || 
               jobText.includes("homeoffice") ||
               jobText.includes("anywhere") ||
               jobText.includes("worldwide");
      });
      console.log(`[Discover] Filtered ${beforeFilter} jobs to ${allJobs.length} remote jobs for unsupported country`);
    }

    const desiredLoc = (profile.desired_location || "").toLowerCase();
    const mapped = allJobs.map((job: any) => {
      const isArbeitnow = job.slug !== undefined;
      const jobText = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();

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

      return {
        id: isArbeitnow ? `arbeitnow_${job.slug}` : `adzuna_${job.id}`,
        title: job.title || "Unknown Role",
        company: isArbeitnow ? (job.company_name || "Unknown") : (job.company?.display_name || "Unknown"),
        location: isArbeitnow ? (job.location || "Unknown") : (job.location?.display_name || `${job.location?.area?.[0] || ""}, ${job.location?.area?.[1] || ""}`),
        description: stripHtml(job.description || ""),
        url: job.url || "#",
        salary_min: job.salary_min || null,
        salary_max: job.salary_max || null,
        salary: isArbeitnow ? "Not specified" : (job.salary_is_predicted === "1" ? `${job.salary_min}-${job.salary_max}` : null),
        remote: !!job.remote,
        source: isArbeitnow ? "Arbeitnow" : "Adzuna",
        match_score: Math.min(100, Math.max(0, score)),
        score,
        created_at: job.created_at || new Date().toISOString(),
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
      fallbackUsed,
      searchTerms,
      location: location || "any",
      isRemote,
      debug: {
        rawLocation: profile.desired_location,
        parsedLocation: location,
        isRemote,
        useArbeitnowPrimary,
        adzunaConfigured: !!(ADZUNA_APP_ID && ADZUNA_APP_KEY),
        adzunaError,
        arbeitnowError,
        totalJobsFound: allJobs.length,
        jobsAfterDedup: deduped.length,
      }
    });
  } catch (err: any) {
    console.error("Discover error:", err);
    return NextResponse.json({ error: "Internal error", details: err.message }, { status: 500 });
  }
}

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
  
  if (specificCountry && !ADZUNA_SUPPORTED.has(specificCountry)) {
    console.log(`[Adzuna] Location "${location}" maps to unsupported country "${specificCountry}", skipping Adzuna`);
    throw new Error(`Unsupported country: ${specificCountry}. Use Arbeitnow instead.`);
  }
  
  if (specificCountry && ADZUNA_SUPPORTED.has(specificCountry)) {
    countriesToSearch.push(specificCountry);
  }
  
  if (isRemote || !specificCountry || !ADZUNA_SUPPORTED.has(specificCountry)) {
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