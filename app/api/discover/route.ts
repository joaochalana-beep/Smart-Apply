import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

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

  const searchTerms = getSearchTerms(profile);
  const location = (profile.desired_location || "").toLowerCase().trim().replace(/\s+/g, " ");
  const isRemote = location.includes("remote") || (profile.work_type || "").toLowerCase() === "remote";

  let allJobs: any[] = [];
  let primarySource = "arbeitnow";
  let fallbackUsed = false;

  // ── PRIMARY: Arbeitnow (EU, free, no API key) ──
  try {
    const arbeitnowJobs = await fetchArbeitnow(searchTerms, location, isRemote);
    allJobs = arbeitnowJobs;
  } catch (err: any) {
    console.error("Arbeitnow failed:", err.message);
    
    // ── FALLBACK: Adzuna (UK/EU) ──
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

  if (allJobs.length === 0) {
    return NextResponse.json({
      jobs: [],
      count: 0,
      message: `No jobs found for "${searchTerms.join(", ")}"${location ? ` near ${location}` : ""}. Try broadening your search terms in Profile.`,
      searchTerms,
      source: primarySource,
      fallbackUsed,
    });
  }

  const scoredJobs = allJobs.map((job) => {
    const score = calculateMatchScore(job, profile);
    return {
      id: `${primarySource}_${job.slug || job.id}`,
      title: job.title || "Unknown Role",
      company: job.company_name || job.company?.display_name || "Unknown Company",
      location: job.location || (job.job_city && job.job_country ? `${job.job_city}, ${job.job_country}` : "Unknown"),
      description: stripHtml(job.description || ""),
      salary_min: null,
      salary_max: null,
      salary: "Not specified",
      url: job.url || job.redirect_url || "",
      contract_type: job.job_types?.join(", ") || job.contract_type || "",
      contract_time: job.job_types?.join(", ") || job.contract_time || "",
      category: job.tags?.join(", ") || job.category?.label || "",
      date_posted: new Date((job.created_at || 0) * 1000).toISOString(),
      match_score: score,
      work_type: isRemote || job.remote ? "remote" : mapWorkType(job.job_types?.join(", ") || ""),
      job_type: mapJobType(job.job_types?.join(", ") || job.contract_type || ""),
      experience_level: inferExperienceLevel(job.title || "", stripHtml(job.description || "")),
      source: primarySource,
    };
  });

  scoredJobs.sort((a, b) => b.match_score - a.match_score);

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

  if (upsertError) console.error("Upsert error:", upsertError);

  return NextResponse.json({
    jobs: scoredJobs,
    count: scoredJobs.length,
    searchTerms,
    source: primarySource,
    fallbackUsed,
  });
}

// ── Arbeitnow fetcher (EU, free, no API key) ──
async function fetchArbeitnow(searchTerms: string[], location: string, isRemote: boolean) {
  const query = searchTerms.join(" ");
  
  // Build location filter
  let locationParam = "";
  if (!isRemote && location && !location.includes("europe") && !location.includes("eu")) {
    locationParam = `&location=${encodeURIComponent(location)}`;
  }

  const remoteParam = isRemote ? "&remote=true" : "";
  
  const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}${locationParam}${remoteParam}&page=1`;
  console.log("Arbeitnow URL:", url);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Arbeitnow API ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  console.log("Arbeitnow returned:", data.data?.length || 0, "jobs");
  
  return data.data || [];
}

// ── Adzuna fallback fetcher ──
async function fetchAdzuna(searchTerms: string[], location: string, isRemote: boolean, profile: any) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Adzuna credentials not configured");
  }

  const searchTerm = searchTerms[0];
  
  const countryMap: Record<string, string> = {
    portugal: "pt", lisbon: "pt", porto: "pt", cascais: "pt", braga: "pt",
    spain: "es", madrid: "es", barcelona: "es",
    france: "fr", paris: "fr", lyon: "fr",
    germany: "de", berlin: "de", munich: "de", hamburg: "de", frankfurt: "de",
    netherlands: "nl", amsterdam: "nl",
    italy: "it", milan: "it", rome: "it",
    ireland: "ie", dublin: "ie",
    uk: "gb", "united kingdom": "gb", london: "gb", england: "gb",
    belgium: "be", austria: "at", switzerland: "ch",
  };

  let country = "gb";
  for (const [key, code] of Object.entries(countryMap)) {
    if (location.includes(key)) {
      country = code;
      break;
    }
  }

  if (location.includes("europe") || location.includes("eu")) {
    country = "gb";
  }

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: "20",
    sort_by: "date",
    max_days_old: "7",
  });

  if (searchTerm) {
    params.append("what", isRemote ? `${searchTerm} remote` : searchTerm);
  }

  if (location && !isRemote && !location.includes("europe") && !location.includes("eu")) {
    params.append("where", location);
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
  console.log("Adzuna URL:", url);

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
  const roles = (profile.desired_role || "")
    .split(/[,;]/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
  terms.push(...roles);
  
  if (terms.length === 0) {
    const skills = (profile.skills || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (skills.length > 0) terms.push(skills[0]);
  }
  
  return terms.length > 0 ? terms : ["jobs"];
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateMatchScore(job: any, profile: any): number {
  let score = 0;
  const profileSkills = (profile.skills || "").toLowerCase().split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  const jobText = `${job.title || ""} ${stripHtml(job.description || "")} ${job.tags?.join(" ") || ""}`.toLowerCase();

  if (profileSkills.length > 0) {
    const matched = profileSkills.filter((skill: string) => jobText.includes(skill));
    score += (matched.length / profileSkills.length) * 45;
  } else {
    score += 20;
  }

  const desiredLoc = (profile.desired_location || "").toLowerCase();
  const jobLoc = (job.location || "").toLowerCase();
  if (desiredLoc) {
    if (jobLoc.includes(desiredLoc) || desiredLoc.includes(jobLoc)) score += 20;
    else if (desiredLoc.includes("remote") && (job.remote || jobText.includes("remote"))) score += 20;
    else if (jobText.includes("remote")) score += 10;
  } else {
    score += 10;
  }

  const profileWorkType = (profile.work_type || "").toLowerCase();
  if (!profileWorkType || profileWorkType === "any") score += 15;
  else if (profileWorkType === "remote" && job.remote) score += 15;
  else if (jobText.includes(profileWorkType)) score += 10;

  const profileExp = (profile.experience_level || "").toLowerCase();
  const inferredExp = inferExperienceLevel(job.title || "", stripHtml(job.description || "")).toLowerCase();
  if (!profileExp || profileExp === inferredExp) score += 10;
  else if ((profileExp === "senior" && inferredExp === "mid") || (profileExp === "mid" && inferredExp === "entry")) score += 5;

  const minDesired = profile.desired_salary_min;
  if (minDesired) {
    score += 5;
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
  if (text.includes("senior") || text.includes("sr.") || text.includes("lead") || text.includes("principal") || text.includes("manager") || text.includes("director")) return "senior";
  if (text.includes("mid") || text.includes("intermediate") || text.includes("ii") || text.includes("2") || text.includes("analyst")) return "mid";
  if (text.includes("junior") || text.includes("jr.") || text.includes("entry") || text.includes("graduate") || text.includes("intern") || text.includes("trainee")) return "entry";
  return "mid";
}