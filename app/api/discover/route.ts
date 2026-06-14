import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!JSEARCH_API_KEY) {
    return NextResponse.json({ error: "JSearch API key not configured" }, { status: 500 });
  }

  const supabase = await createClient();

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "No profile found. Please set up your profile first." }, { status: 400 });
  }

  const hasDesiredRole = !!(profile.desired_role || "").trim();
  const hasSkills = !!(profile.skills || "").trim();

  if (!hasDesiredRole && !hasSkills) {
    return NextResponse.json({
      error: "Profile incomplete",
      message: "Please set your Desired Role or Skills in your Profile to discover jobs.",
      needsProfileUpdate: true,
    }, { status: 400 });
  }

  // Build search term from desired roles or skills
  const searchTerms = getSearchTerms(profile);
  const location = (profile.desired_location || "").toLowerCase();
  const isRemote = location.includes("remote") || (profile.work_type || "").toLowerCase() === "remote";

  let allJobs: any[] = [];
  let primarySource = "jsearch";
  let fallbackUsed = false;

  // ── PRIMARY: JSearch ──
  try {
    const jsearchJobs = await fetchJSearch(searchTerms, location, isRemote, profile);
    allJobs = jsearchJobs;
  } catch (err: any) {
    console.error("JSearch failed:", err.message);
    
    // ── FALLBACK: Adzuna ──
    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      try {
        const adzunaJobs = await fetchAdzuna(searchTerms, location, isRemote, profile);
        allJobs = adzunaJobs;
        primarySource = "adzuna";
        fallbackUsed = true;
      } catch (adzunaErr: any) {
        console.error("Adzuna fallback also failed:", adzunaErr.message);
        return NextResponse.json({
          error: "Both job sources failed",
          details: `JSearch: ${err.message}, Adzuna: ${adzunaErr.message}`,
          suggestion: "Try again in a few minutes.",
        }, { status: 502 });
      }
    } else {
      return NextResponse.json({
        error: "JSearch failed and no Adzuna fallback configured",
        details: err.message,
      }, { status: 502 });
    }
  }

  if (allJobs.length === 0) {
    return NextResponse.json({
      jobs: [],
      count: 0,
      message: `No jobs found for "${searchTerms.join(", ")}"${location ? ` in ${location}` : ""}. Try broadening your search terms in Profile.`,
      searchTerms,
      source: primarySource,
      fallbackUsed,
    });
  }

  // Score and normalize all jobs
  const scoredJobs = allJobs.map((job) => {
    const score = calculateMatchScore(job, profile);
    return {
      id: `${primarySource}_${job.id || job.job_id}`,
      title: job.job_title || job.title || "Unknown Role",
      company: job.employer_name || job.company || job.company_name || "Unknown Company",
      location: job.job_city && job.job_country 
        ? `${job.job_city}, ${job.job_country}` 
        : job.location || job.job_location || location || "Unknown",
      description: job.job_description || job.description || "",
      salary_min: job.job_min_salary || job.salary_min || null,
      salary_max: job.job_max_salary || job.salary_max || null,
      salary: formatSalary(
        job.job_min_salary || job.salary_min,
        job.job_max_salary || job.salary_max,
        job.job_salary_currency
      ),
      url: job.job_apply_link || job.job_google_link || job.redirect_url || job.url || "",
      contract_type: job.job_employment_type || job.contract_type || "",
      contract_time: job.job_employment_type || job.contract_time || "",
      category: job.job_category || job.category || "",
      date_posted: job.job_posted_at_datetime_utc || job.date_posted || job.created_at || new Date().toISOString(),
      match_score: score,
      work_type: mapWorkType(job.job_employment_type || job.contract_time),
      job_type: mapJobType(job.job_employment_type || job.contract_type),
      experience_level: inferExperienceLevel(
        job.job_title || job.title || "",
        job.job_description || job.description || ""
      ),
      source: primarySource,
    };
  });

  scoredJobs.sort((a, b) => b.match_score - a.match_score);

  // Save to DB
  const jobsToUpsert = scoredJobs.map((job) => ({
    user_id: userId,
    company: job.company,
    role: job.title,
    description: job.description,
    url: job.url,
    salary: job.salary,
    location: job.location,
    work_type: job.work_type,
    job_type: job.job_type,
    experience_level: job.experience_level,
    source: job.source,
    match_score: job.match_score,
    status: "new",
  }));

  const { error: upsertError } = await supabase
    .from("jobs")
    .upsert(jobsToUpsert, { onConflict: "user_id,url" });

  if (upsertError) {
    console.error("Upsert error:", upsertError);
  }

  return NextResponse.json({
    jobs: scoredJobs,
    count: scoredJobs.length,
    searchTerms,
    source: primarySource,
    fallbackUsed,
  });
}

// ── JSearch fetcher ──
async function fetchJSearch(searchTerms: string[], location: string, isRemote: boolean, profile: any) {
  const query = searchTerms.join(" OR ");
  
  // JSearch uses country codes: us, uk, ca, au, de, fr, es, it, pt, nl, etc.
  let country = "";
  const loc = location.toLowerCase();
  
  if (isRemote) {
    country = ""; // Remote searches don't need country
  } else if (loc.includes("portugal") || loc.includes("lisbon") || loc.includes("cascais") || loc.includes("porto")) {
    country = "pt";
  } else if (loc.includes("spain") || loc.includes("madrid") || loc.includes("barcelona")) {
    country = "es";
  } else if (loc.includes("france") || loc.includes("paris") || loc.includes("lyon")) {
    country = "fr";
  } else if (loc.includes("germany") || loc.includes("berlin") || loc.includes("munich")) {
    country = "de";
  } else if (loc.includes("netherlands") || loc.includes("amsterdam")) {
    country = "nl";
  } else if (loc.includes("italy") || loc.includes("milan") || loc.includes("rome")) {
    country = "it";
  } else if (loc.includes("ireland") || loc.includes("dublin")) {
    country = "ie";
  } else if (loc.includes("uk") || loc.includes("london") || loc.includes("england")) {
    country = "uk";
  } else if (loc.includes("usa") || loc.includes("america") || loc.includes("new york")) {
    country = "us";
  }

  const params = new URLSearchParams({
    query: isRemote ? `${query} remote` : query,
    page: "1",
    num_pages: "1",
  });

  if (country) {
    params.append("country", country);
  }

  // JSearch RapidAPI endpoint
  const url = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": JSEARCH_API_KEY!,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`JSearch API ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.data || []; // JSearch returns { data: [...] }
}

// ── Adzuna fallback fetcher ──
async function fetchAdzuna(searchTerms: string[], location: string, isRemote: boolean, profile: any) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Adzuna credentials not configured");
  }

  const searchTerm = searchTerms[0]; // Adzuna uses single search term
  const loc = location.toLowerCase();
  let country = "gb";
  
  if (loc.includes("usa") || loc.includes("united states")) country = "us";
  else if (loc.includes("germany") || loc.includes("berlin")) country = "de";
  else if (loc.includes("france") || loc.includes("paris")) country = "fr";

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: "20",
    sort_by: "date",
    max_days_old: "7",
  });

  if (searchTerm) params.append("what", isRemote ? `${searchTerm} remote` : searchTerm);
  if (location && !isRemote) params.append("where", location);

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Adzuna API ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.results || [];
}

// ── Helpers ──

function getSearchTerms(profile: any): string[] {
  const terms: string[] = [];
  
  // Add desired roles
  const roles = (profile.desired_role || "")
    .split(/[,;]/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
  terms.push(...roles);
  
  // If no roles, use first skill
  if (terms.length === 0) {
    const skills = (profile.skills || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (skills.length > 0) terms.push(skills[0]);
  }
  
  return terms.length > 0 ? terms : ["jobs"];
}

function formatSalary(min: number | null, max: number | null, currency?: string): string {
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  if (!min && !max) return "Not specified";
  if (min && !max) return `${sym}${Math.round(min / 1000)}k+`;
  if (!min && max) return `${sym}Up to ${Math.round(max / 1000)}k`;
  return `${sym}${Math.round(min! / 1000)}k - ${sym}${Math.round(max! / 1000)}k`;
}

function calculateMatchScore(job: any, profile: any): number {
  let score = 0;

  const profileSkills = (profile.skills || "")
    .toLowerCase()
    .split(",")
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  const jobText = `${job.job_title || job.title || ""} ${job.job_description || job.description || ""}`.toLowerCase();

  if (profileSkills.length > 0) {
    const matched = profileSkills.filter((skill: string) => jobText.includes(skill));
    score += (matched.length / profileSkills.length) * 45;
  } else {
    score += 20;
  }

  const desiredLoc = (profile.desired_location || "").toLowerCase();
  const jobLoc = (job.job_city || job.location || "").toLowerCase();
  if (desiredLoc) {
    if (jobLoc.includes(desiredLoc) || desiredLoc.includes(jobLoc)) {
      score += 20;
    } else if (desiredLoc.includes("remote") && jobText.includes("remote")) {
      score += 20;
    } else if (jobText.includes("remote")) {
      score += 10;
    }
  } else {
    score += 10;
  }

  const profileWorkType = (profile.work_type || "").toLowerCase();
  const jobWorkType = mapWorkType(job.job_employment_type || "").toLowerCase();
  if (!profileWorkType || profileWorkType === "any") {
    score += 15;
  } else if (profileWorkType === jobWorkType) {
    score += 15;
  } else if (jobText.includes(profileWorkType)) {
    score += 10;
  }

  const profileExp = (profile.experience_level || "").toLowerCase();
  const inferredExp = inferExperienceLevel(
    job.job_title || job.title || "",
    job.job_description || job.description || ""
  ).toLowerCase();
  if (!profileExp || profileExp === inferredExp) {
    score += 10;
  } else if (
    (profileExp === "senior" && inferredExp === "mid") ||
    (profileExp === "mid" && inferredExp === "entry")
  ) {
    score += 5;
  }

  const minDesired = profile.desired_salary_min;
  const jobMax = job.job_max_salary || job.salary_max;
  if (minDesired && jobMax) {
    if (jobMax >= minDesired) {
      score += 10;
    } else if (jobMax >= minDesired * 0.8) {
      score += 5;
    }
  } else {
    score += 5;
  }

  return Math.min(Math.round(score), 100);
}

function mapWorkType(employmentType: string): string {
  if (!employmentType) return "";
  const et = employmentType.toLowerCase();
  if (et.includes("full") || et.includes("ft")) return "full-time";
  if (et.includes("part") || et.includes("pt")) return "part-time";
  if (et.includes("contract") || et.includes("temporary")) return "contract";
  if (et.includes("intern")) return "internship";
  return "";
}

function mapJobType(contractType: string): string {
  if (!contractType) return "";
  const ct = contractType.toLowerCase();
  if (ct.includes("permanent") || ct.includes("full")) return "full-time";
  if (ct.includes("contract") || ct.includes("temporary")) return "contract";
  return "";
}

function inferExperienceLevel(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("senior") || text.includes("sr.") || text.includes("lead") || text.includes("principal") || text.includes("manager")) {
    return "senior";
  }
  if (text.includes("mid") || text.includes("intermediate") || text.includes("ii") || text.includes("2") || text.includes("analyst")) {
    return "mid";
  }
  if (text.includes("junior") || text.includes("jr.") || text.includes("entry") || text.includes("graduate") || text.includes("intern") || text.includes("trainee")) {
    return "entry";
  }
  return "mid";
}