import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

// Adzuna supported country codes
const ADZUNA_COUNTRIES = new Set(["gb", "us", "at", "au", "br", "ca", "de", "fr", "in", "it", "nl", "pl", "ru", "sg", "za", "es", "se", "ch"]);

const countryMap: Record<string, string> = {
  "united kingdom": "gb", "uk": "gb", "london": "gb", "england": "gb",
  "germany": "de", "deutschland": "de", "berlin": "de", "munich": "de", "münchen": "de",
  "hamburg": "de", "cologne": "de", "köln": "de", "frankfurt": "de", "stuttgart": "de",
  "dresden": "de", "leipzig": "de", "düsseldorf": "de", "nuremberg": "de", "nürnberg": "de",
  "hannover": "de", "bremen": "de", "essen": "de", "dortmund": "de",
  "portugal": "pt", "lisbon": "pt", "lisboa": "pt", "porto": "pt",
  "spain": "es", "madrid": "es", "barcelona": "es", "valencia": "es",
  "france": "fr", "paris": "fr", "lyon": "fr", "marseille": "fr",
  "netherlands": "nl", "amsterdam": "nl", "rotterdam": "nl",
  "italy": "it", "rome": "it", "milano": "it", "milan": "it",
  "belgium": "be", "brussels": "be",
  "austria": "at", "vienna": "at", "wien": "at",
  "ireland": "ie", "dublin": "ie",
  "switzerland": "ch", "zurich": "ch", "geneva": "ch",
  "poland": "pl", "warsaw": "pl",
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

function isGermanOrGenericLocation(loc: string): boolean {
  if (!loc || loc.trim() === "") return true;
  const generic = ["remote", "europe", "eu", "anywhere", "worldwide", "global"];
  if (generic.some(g => loc.includes(g))) return true;
  const german = ["germany", "deutschland", "berlin", "munich", "münchen", "hamburg", "cologne", "köln", "frankfurt", "stuttgart", "dresden", "leipzig", "düsseldorf", "nuremberg", "nürnberg", "hannover", "bremen", "essen", "dortmund"];
  return german.some(g => loc.includes(g));
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
    const useArbeitnowPrimary = isGermanOrGenericLocation(location);

    let adzunaError = null;
    let arbeitnowError = null;

    if (useArbeitnowPrimary) {
      primarySource = "arbeitnow";
      try {
        const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote);
        allJobs = arbeitnowJobs;
      } catch (err: any) {
        arbeitnowError = err.message;
        console.error("[Discover] Arbeitnow failed:", err.message);
        if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
          try {
            const adzunaJobs = await fetchAdzuna(searchTerms, location, isRemote);
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
      // Non-German location: Adzuna primary
      if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
        primarySource = "adzuna";
        try {
          const adzunaJobs = await fetchAdzuna(searchTerms, location, isRemote);
          allJobs = adzunaJobs;
          console.log(`[Discover] Adzuna returned ${allJobs.length} jobs`);
          
          // If Adzuna returned 0 jobs, try broader search without location filter
          if (allJobs.length === 0 && location) {
            console.log("[Discover] Adzuna returned 0 jobs, trying broader search without location filter");
            const broadJobs = await fetchAdzuna(searchTerms, "", isRemote);
            if (broadJobs.length > 0) {
              allJobs = broadJobs;
              console.log(`[Discover] Broad Adzuna search returned ${allJobs.length} jobs`);
            }
          }
        } catch (err: any) {
          adzunaError = err.message;
          console.error("[Discover] Adzuna failed:", err.message);
          try {
            const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote);
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
          const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote);
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

async function fetchArbeitnow(searchTerms: string[], location: string, isRemote: boolean) {
  const query = searchTerms.join(" ");
  let locationParam = "";
  
  if (location && !location.includes("europe") && !location.includes("eu") && !location.includes("anywhere")) {
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

async function fetchAdzuna(searchTerms: string[], location: string, isRemote: boolean) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Adzuna credentials not configured");
  }

  // Determine country code
  let country = "gb"; // Default to UK (largest Adzuna DB with most remote jobs)
  for (const [key, code] of Object.entries(countryMap)) {
    if (location.includes(key)) {
      country = code;
      break;
    }
  }

  // If country not supported by Adzuna, use gb with location as search term
  const useGbFallback = !ADZUNA_COUNTRIES.has(country);
  if (useGbFallback) {
    console.log(`[Adzuna] Country "${country}" not in supported list, using gb with location in search`);
    country = "gb";
  }

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: "50",
  });

  // Build search query
  let searchQuery = searchTerms.join(" ");
  
  // For remote jobs with unsupported countries, include location in search query
  if (isRemote && useGbFallback && location) {
    searchQuery = `${searchQuery} ${location}`;
  }
  
  if (isRemote) {
    searchQuery = `${searchQuery} remote`;
  }
  
  params.append("what", searchQuery);

  // Only add where param for supported countries with non-remote jobs
  // For remote jobs, skip where to get global remote listings
  if (!isRemote && location && !location.includes("europe") && !location.includes("eu") && !location.includes("anywhere")) {
    params.append("where", location);
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
  console.log("[Adzuna] URL:", url);

  const res = await fetch(url, { next: { revalidate: 0 } });
  
  const responseText = await res.text();
  
  if (!res.ok) {
    console.error("[Adzuna] Error response:", responseText.slice(0, 500));
    throw new Error(`Adzuna API ${res.status}: ${responseText.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Adzuna returned invalid JSON: ${responseText.slice(0, 200)}`);
  }

  console.log("[Adzuna] Returned", data.results?.length || 0, "jobs");
  return data.results || [];
}