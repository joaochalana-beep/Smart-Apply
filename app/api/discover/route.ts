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

  // Build Adzuna search params
  const country = "us"; // Default to US. You can make this dynamic later.
  const searchTerm = profile.desired_role || "software engineer";
  const location = profile.desired_location || "";
  
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    what: searchTerm,
    what_or: profile.skills || "",
    max_age: "7", // Jobs posted in last 7 days
    sort_by: "date",
    results_per_page: "20",
  });

  if (location && !location.toLowerCase().includes("remote")) {
    params.append("where", location);
  }

  try {
    const adzunaRes = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`
    );

    if (!adzunaRes.ok) {
      const err = await adzunaRes.text();
      console.error("Adzuna error:", err);
      return NextResponse.json({ error: "Failed to fetch jobs from Adzuna" }, { status: 502 });
    }

    const adzunaData = await adzunaRes.json();
    const rawJobs = adzunaData.results || [];

    // Score and format jobs
    const scoredJobs = rawJobs.map((job: any) => {
      const score = calculateMatchScore(job, profile);
      return {
        id: `adzuna_${job.id}`, // Use Adzuna ID prefixed to avoid collisions
        title: job.title || "Unknown Role",
        company: job.company?.display_name || "Unknown Company",
        location: job.location?.display_name || location || "Unknown",
        description: job.description || "",
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary: job.salary_is_predicted === "1" ? "Predicted" : `${job.salary_min || 0} - ${job.salary_max || 0}`,
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

    // Sort by match score descending
    scoredJobs.sort((a: any, b: any) => b.match_score - a.match_score);

    // Save discovered jobs to DB (upsert to avoid duplicates)
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

    // Upsert ignores duplicates on (user_id, url) if you add a unique constraint
    // For now, just insert and let RLS handle ownership
    const { error: upsertError } = await supabase
      .from("jobs")
      .upsert(jobsToUpsert, { onConflict: "user_id,url" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    return NextResponse.json({ jobs: scoredJobs, count: scoredJobs.length });
  } catch (error: any) {
    console.error("Discover error:", error);
    return NextResponse.json({ error: error.message || "Failed to discover jobs" }, { status: 500 });
  }
}

function calculateMatchScore(job: any, profile: any): number {
  let score = 0;
  
  const profileSkills = (profile.skills || "")
    .toLowerCase()
    .split(",")
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
  
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  
  // Skills match (up to 45 points)
  if (profileSkills.length > 0) {
    const matched = profileSkills.filter((skill: string) => jobText.includes(skill));
    score += (matched.length / profileSkills.length) * 45;
  } else {
    score += 20; // Neutral if no skills listed
  }
  
  // Location match (up to 20 points)
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
  
  // Work type match (up to 15 points)
  const profileWorkType = (profile.work_type || "").toLowerCase();
  const jobWorkType = mapContractTime(job.contract_time).toLowerCase();
  if (!profileWorkType || profileWorkType === "any") {
    score += 15;
  } else if (profileWorkType === jobWorkType) {
    score += 15;
  } else if (jobText.includes(profileWorkType)) {
    score += 10;
  }
  
  // Experience level match (up to 10 points)
  const profileExp = (profile.experience_level || "").toLowerCase();
  const inferredExp = inferExperienceLevel(job.title, job.description).toLowerCase();
  if (!profileExp || profileExp === inferredExp) {
    score += 10;
  } else if (
    (profileExp === "senior" && inferredExp === "mid") ||
    (profileExp === "mid" && inferredExp === "entry")
  ) {
    score += 5; // Close enough
  }
  
  // Salary match (up to 10 points)
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
  return "mid"; // Default
}