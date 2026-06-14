import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

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
  if (!loc || loc.trim() === "") {
    console.log("[DEBUG] Location empty, treating as generic/German");
    return true;
  }
  const generic = ["remote", "europe", "eu", "anywhere", "worldwide", "global"];
  if (generic.some(g => loc.includes(g))) {
    console.log(`[DEBUG] Location "${loc}" contains generic term, treating as German/generic`);
    return true;
  }
  const german = ["germany", "deutschland", "berlin", "munich", "münchen", "hamburg", "cologne", "köln", "frankfurt", "stuttgart", "dresden", "leipzig", "düsseldorf", "nuremberg", "nürnberg", "hannover", "bremen", "essen", "dortmund"];
  const isGerman = german.some(g => loc.includes(g));
  console.log(`[DEBUG] Location "${loc}" isGerman=${isGerman}`);
  return isGerman;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[DEBUG] User ${userId} requesting discover`);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("desired_role, desired_location, work_type, experience_level, id")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("[DEBUG] Profile fetch error:", profileError);
    }

    if (!profile) {
      console.log("[DEBUG] No profile found for user");
      return NextResponse.json({ 
        error: "Profile not found", 
        needsProfileUpdate: true, 
        message: "Please complete your profile to discover jobs." 
      }, { status: 404 });
    }

    console.log("[DEBUG] Raw profile:", JSON.stringify({
      desired_role: profile.desired_role,
      desired_location: profile.desired_location,
      work_type: profile.work_type,
    }));

    const searchTerms = getSearchTerms(profile);
    const rawLocation = (profile.desired_location || "").toLowerCase().trim().replace(/\s+/g, " ");
    const isRemote = rawLocation.includes("remote") || (profile.work_type || "").toLowerCase() === "remote";
    const location = rawLocation.replace(/remote/g, "").replace(/,/g, " ").trim();

    console.log(`[DEBUG] Parsed: rawLocation="${rawLocation}", location="${location}", isRemote=${isRemote}`);

    let allJobs: any[] = [];
    let primarySource = "";
    let fallbackUsed = false;
    const useArbeitnowPrimary = isGermanOrGenericLocation(location);

    console.log(`[DEBUG] useArbeitnowPrimary=${useArbeitnowPrimary}, ADZUNA configured=${!!(ADZUNA_APP_ID && ADZUNA_APP_KEY)}`);

    if (useArbeitnowPrimary) {
      primarySource = "arbeitnow";
      try {
        const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote);
        allJobs = arbeitnowJobs;
        console.log(`[DEBUG] Arbeitnow returned ${allJobs.length} jobs`);
      } catch (err: any) {
        console.error("[DEBUG] Arbeitnow failed:", err.message);
        if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
          try {
            const adzunaJobs = await fetchAdzuna(searchTerms, location, isRemote);
            allJobs = adzunaJobs;
            primarySource = "adzuna";
            fallbackUsed = true;
            console.log(`[DEBUG] Adzuna fallback returned ${allJobs.length} jobs`);
          } catch (adzunaErr: any) {
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
          console.log(`[DEBUG] Adzuna primary returned ${allJobs.length} jobs`);
        } catch (err: any) {
          console.error("[DEBUG] Adzuna failed:", err.message);
          try {
            const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote);
            allJobs = arbeitnowJobs;
            primarySource = "arbeitnow";
            fallbackUsed = true;
            console.log(`[DEBUG] Arbeitnow fallback returned ${allJobs.length} jobs`);
          } catch (arbeitnowErr: any) {
            return NextResponse.json({
              error: "Both job sources failed",
              details: `Adzuna: ${err.message}, Arbeitnow: ${arbeitnowErr.message}`,
            }, { status: 502 });
          }
        }
      } else {
        console.warn("[DEBUG] No Adzuna credentials! Falling back to Arbeitnow (will show German jobs)");
        primarySource = "arbeitnow";
        try {
          const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote);
          allJobs = arbeitnowJobs;
          console.log(`[DEBUG] Arbeitnow (no Adzuna creds) returned ${allJobs.length} jobs`);
        } catch (err: any) {
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

    console.log(`[DEBUG] Returning ${deduped.length} jobs, source=${primarySource}, fallback=${fallbackUsed}`);

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
  console.log("[DEBUG] Arbeitnow URL:", url);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Arbeitnow API ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  console.log("[DEBUG] Arbeitnow returned", data.data?.length || 0, "jobs");
  return data.data || [];
}

async function fetchAdzuna(searchTerms: string[], location: string, isRemote: boolean) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Adzuna credentials not configured");
  }

  let country = "gb";
  for (const [key, code] of Object.entries(countryMap)) {
    if (location.includes(key)) {
      country = code;
      break;
    }
  }
  if (!location || location.includes("europe") || location.includes("eu") || location.includes("anywhere")) {
    country = "gb";
  }

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: "50",
  });

  const searchQuery = searchTerms.join(" ");
  const whatValue = isRemote ? `${searchQuery} remote` : searchQuery;
  params.append("what", whatValue);

  if (location && !location.includes("europe") && !location.includes("eu") && !location.includes("anywhere") && !location.includes("remote")) {
    params.append("where", location);
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
  console.log("[DEBUG] Adzuna URL:", url);

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Adzuna API ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  console.log("[DEBUG] Adzuna returned", data.results?.length || 0, "jobs");
  return data.results || [];
}