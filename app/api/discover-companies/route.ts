import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 500;

const platformToSource: Record<string, string> = {
  "greenhouse": "company_careers_greenhouse",
  "lever": "company_careers_lever",
  "workday": "company_careers_workday",
  "ashby": "company_careers_ashby",
  "bamboohr": "company_careers_bamboohr",
  "unknown": "company_careers_unknown",
};

interface ScrapedJob {
  id?: string;
  title?: string;
  role?: string;
  job_title?: string;
  company?: string;
  company_name?: string;
  location?: string;
  locations?: string;
  city?: string;
  description?: string;
  job_description?: string;
  url?: string;
  job_url?: string;
  apply_url?: string;
  link?: string;
  platform?: string;
  source?: string;
  is_remote?: boolean;
  remote?: boolean;
  work_type?: string;
  posted_at?: string;
  scraped_at?: string;
  created_at?: string;
  salary?: string;
  compensation?: string;
  job_type?: string;
  experience_level?: string;
  department?: string;
  sector?: string;
  region?: string;
  country?: string;
}

function findJobsFile(): { filePath: string; jobs: ScrapedJob[]; source: string } | null {
  const possibleFiles = [
    join(process.cwd(), "app_jobs.json"),
    join(process.cwd(), "scraped_jobs.json"),
    join(process.cwd(), "combined_jobs.json"),
    join(process.cwd(), "..", "app_jobs.json"),
    join(process.cwd(), "..", "scraped_jobs.json"),
  ];

  let bestFile: { filePath: string; jobs: ScrapedJob[]; source: string } | null = null;

  for (const filePath of possibleFiles) {
    try {
      const fileContent = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(fileContent);
      const jobs = Array.isArray(parsed) ? parsed : (parsed.jobs || parsed.app_jobs || []);

      console.log(`[DiscoverCompanies] Found file: ${filePath} with ${jobs.length} jobs`);

      if (!bestFile || jobs.length > bestFile.jobs.length) {
        bestFile = { filePath, jobs, source: filePath };
      }
    } catch {
      // File doesn't exist or can't be read
    }
  }

  return bestFile;
}

function mapJob(job: ScrapedJob) {
  const id = randomUUID();

  return {
    id,
    user_id: null,
    company: job.company || job.company_name || "Unknown Company",
    role: job.title || job.role || job.job_title || "Unknown Role",
    description: job.description || job.job_description || "",
    url: job.url || job.job_url || job.apply_url || job.link || "",
    status: "new" as const,
    created_at: job.posted_at || job.scraped_at || job.created_at || new Date().toISOString(),
    salary: job.salary || job.compensation || null,
    location: job.location || job.locations || job.city || null,
    work_type: job.is_remote ? "Remote" : job.remote ? "Remote" : (job.work_type || "On-site"),
    job_type: job.job_type || "Full-time",
    experience_level: job.experience_level || null,
    source: platformToSource[(job.platform || job.source || "unknown").toLowerCase()] || "company_careers_unknown",
    match_score: 0,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || Infinity;
    const skipExisting = body.skipExisting !== false;

    // Find the best jobs file
    const fileResult = findJobsFile();

    if (!fileResult) {
      return NextResponse.json(
        { error: "No scraped jobs file found anywhere" },
        { status: 400 }
      );
    }

    const { filePath, jobs: scrapedJobs } = fileResult;

    console.log(`[DiscoverCompanies] Using file: ${filePath} with ${scrapedJobs.length} jobs`);

    if (scrapedJobs.length === 0) {
      return NextResponse.json({ error: "No jobs found in file" }, { status: 400 });
    }

    const jobsToImport = scrapedJobs.slice(0, limit);

    // If skipExisting, fetch existing URLs to avoid duplicates
    let existingUrls = new Set<string>();
    if (skipExisting) {
      const { data: existing } = await supabase
        .from("jobs")
        .select("url")
        .not("url", "is", null);

      if (existing) {
        existingUrls = new Set(existing.map((j: any) => j.url));
      }
    }

    // Map and filter
    const jobsMapped = jobsToImport
      .map(mapJob)
      .filter((job) => {
        if (!job.url || job.url === "") return false;
        if (skipExisting && existingUrls.has(job.url)) return false;
        return true;
      });

    const skipped = jobsToImport.length - jobsMapped.length;

    console.log(`[DiscoverCompanies] Importing ${jobsMapped.length} jobs (${skipped} skipped)`);

    // Batch insert
    let totalImported = 0;
    for (let i = 0; i < jobsMapped.length; i += BATCH_SIZE) {
      const batch = jobsMapped.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("jobs")
        .upsert(batch, { onConflict: "id" });

      if (error) {
        console.error(`[DiscoverCompanies] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error);
        return NextResponse.json({
          error: "Failed to import batch",
          details: error.message,
          imported_so_far: totalImported,
        }, { status: 500 });
      }
      totalImported += batch.length;
    }

    // Get final count
    const { count } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      imported: totalImported,
      skipped,
      total_available: scrapedJobs.length,
      db_total: count,
      file_used: filePath,
    });

  } catch (err: any) {
    console.error("[DiscoverCompanies] Error:", err);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const fileResult = findJobsFile();
    const scrapedJobs = fileResult?.jobs || [];
    const filePath = fileResult?.filePath || "not found";

    const { count, error } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      available_in_file: scrapedJobs.length,
      file_found: fileResult !== null,
      file_path: filePath,
      db_total_jobs: count || 0,
      message: fileResult
        ? `POST to import ${scrapedJobs.length} jobs from ${filePath}. DB has ${count || 0} jobs.`
        : "No scraped jobs file found anywhere.",
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}