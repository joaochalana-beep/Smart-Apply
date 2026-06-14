import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return NextResponse.json({ error: "Adzuna API keys not configured" }, { status: 500 });
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

  // Check if profile has enough info for search
  const hasDesiredRole = !!(profile.desired_role || "").trim();
  const hasSkills = !!(profile.skills || "").trim();

  if (!hasDesiredRole && !hasSkills) {
    return NextResponse.json({
      error: "Profile incomplete",
      message: "Please set your Desired Role or Skills in your Profile to discover jobs.",
      needsProfileUpdate: true,
    }, { status: 400 });
  }

  // Build search term
  let searchTerm = (profile.desired_role || "").trim();
  if (!searchTerm) {
    // Use first skill as fallback
    searchTerm = (profile.skills || "").split(",")[0].trim();
  }

  // Adzuna country codes: gb, us, au, br, ca, de, fr, in, nl, pl, ru, sg, za
  // Default to gb (UK) for broader results, or infer from location
  const location = (profile.desired_location || "").toLowerCase();
  let country = "gb";
  if (location.includes("usa") || location.includes("united states") || location.includes("america")) {
    country = "us";
  } else if (location.includes("portugal") || location.includes("lisbon") || location.includes("cascais")) {
    country = "gb"; // No PT in free tier, use gb with location filter
  }

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: "20",
    sort_by: "date",
    max_days_old: "7",
  });

  // Add search term - use 'what' for job title/keywords
  if (searchTerm) {
    params.append("what", searchTerm);
  }

  // Add location if specified and not remote
  const isRemote = location.includes("remote") || (profile.work_type || "").toLowerCase() === "remote";
  if (location && !isRemote) {
    params.append("where", location);
  }

  // For remote jobs, don't add location filter but add remote to search
  if (isRemote && searchTerm) {
    params.set("what", `${searchTerm} remote`);
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;

  try {
    const adzunaRes = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!adzunaRes.ok) {
      const errorText = await adzunaRes.text();
      console.error("Adzuna API error:", adzunaRes.status, errorText.slice(0, 500));
      return NextResponse.json(
        {
          error: `Adzuna API returned ${adzunaRes.status}`,
          details: errorText.slice(0, 200),
          searchTerm,
          country,
          suggestion: "This may be a temporary Adzuna issue. Try again in a few minutes.",
        },
        { status: 502 }
      );
    }

    const adzunaData = await adzunaRes.json();
    const rawJobs = adzunaData.results || [];

    if (rawJobs.length === 0) {
      return NextResponse.json({
        jobs: [],
        count: 0,
        message: `No jobs found for "${searchTerm}" in ${country.toUpperCase()}. Try broadening your search terms in Profile.`,
        searchTerm,
        country,
      });
    }

    // Score and format jobs
    const scoredJobs = rawJobs.map((job: any) => {
      const score = calculateMatchScore(job, profile);
      return {
        id: `adzuna_${job.id}`,
        title: job.title || "Unknown Role",
        company: job.company?.display_name || "Unknown Company",
        location: job.location?.display_name || location || "Unknown",
        description: job.description || "",
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary: formatSalary(job.salary_min, job.salary_max, job.salary_is_predicted),
        url: job.redirect_url,
        contract_type: job.contract_type || "",
        contract_time: job.contract_time || "",
        category: job.category?.label || "",
        date_posted: job.created_at,
        match_score: score,
        work_type: mapContractTime(job.contract_time),
        job_type: mapContractType(job.contract_type),
        experience_level: inferExperienceLevel(job.title, job.description),
      };
    });

    scoredJobs.sort((a: any, b: any) => b.match_score - a.match_score);

    // Save to DB
    const jobsToUpsert = scoredJobs.map((job: any) => ({
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
      source: "adzuna",
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
      searchTerm,
      country,
    });

  } catch (error: any) {
    console.error("Discover error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to discover jobs", searchTerm, country },
      { status: 500 }
    );
  }
}

function formatSalary(min: number | null, max: number | null, isPredicted: string | number): string {
  if (isPredicted === "1" || isPredicted === 1) return "Salary predicted";
  if (!min && !max) return "Not specified";
  if (min && !max) return `${Math.round(min / 1000)}k+`;
  if (!min && max) return `Up to ${Math.round(max / 1000)}k`;
  return `${Math.round(min! / 1000)}k - ${Math.round(max! / 1000)}k`;
}

function calculateMatchScore(job: any, profile: any): number {
  let score = 0;

  const profileSkills = (profile.skills || "")
    .toLowerCase()
    .split(",")
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  const jobText = `${job.title} ${job.description}`.toLowerCase();

  if (profileSkills.length > 0) {
    const matched = profileSkills.filter((skill: string) => jobText.includes(skill));
    score += (matched.length / profileSkills.length) * 45;
  } else {
    score += 20;
  }

  const desiredLoc = (profile.desired_location || "").toLowerCase();
  const jobLoc = (job.location?.display_name || "").toLowerCase();
  if (desiredLoc) {
    if (jobLoc.includes(desiredLoc) || desiredLoc.includes(jobLoc)) {
      score += 20;
    } else if (desiredLoc.includes("remote") && jobText.includes("remote")) {
      score += 20;
    } else if (jobLoc.includes("remote")) {
      score += 10;
    }
  } else {
    score += 10;
  }

  const profileWorkType = (profile.work_type || "").toLowerCase();
  const jobWorkType = mapContractTime(job.contract_time).toLowerCase();
  if (!profileWorkType || profileWorkType === "any") {
    score += 15;
  } else if (profileWorkType === jobWorkType) {
    score += 15;
  } else if (jobText.includes(profileWorkType)) {
    score += 10;
  }

  const profileExp = (profile.experience_level || "").toLowerCase();
  const inferredExp = inferExperienceLevel(job.title, job.description).toLowerCase();
  if (!profileExp || profileExp === inferredExp) {
    score += 10;
  } else if (
    (profileExp === "senior" && inferredExp === "mid") ||
    (profileExp === "mid" && inferredExp === "entry")
  ) {
    score += 5;
  }

  const minDesired = profile.desired_salary_min;
  if (minDesired && job.salary_max) {
    if (job.salary_max >= minDesired) {
      score += 10;
    } else if (job.salary_max >= minDesired * 0.8) {
      score += 5;
    }
  } else {
    score += 5;
  }

  return Math.min(Math.round(score), 100);
}

function mapContractTime(contractTime: string): string {
  if (!contractTime) return "";
  const ct = contractTime.toLowerCase();
  if (ct.includes("full_time")) return "full-time";
  if (ct.includes("part_time")) return "part-time";
  return "";
}

function mapContractType(contractType: string): string {
  if (!contractType) return "";
  const ct = contractType.toLowerCase();
  if (ct.includes("permanent")) return "full-time";
  if (ct.includes("contract")) return "contract";
  if (ct.includes("temporary")) return "contract";
  return "";
}

function inferExperienceLevel(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("senior") || text.includes("sr.") || text.includes("lead") || text.includes("principal")) {
    return "senior";
  }
  if (text.includes("mid") || text.includes("intermediate") || text.includes("ii") || text.includes("2")) {
    return "mid";
  }
  if (text.includes("junior") || text.includes("jr.") || text.includes("entry") || text.includes("graduate") || text.includes("intern")) {
    return "entry";
  }
  return "mid";
}