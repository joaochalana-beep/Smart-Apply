import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const filePath = body.filePath || join(process.cwd(), "app_jobs.json");
    const limit = body.limit || Infinity;

    let scrapedJobs;
    try {
      const fileContent = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(fileContent);
      scrapedJobs = Array.isArray(parsed) ? parsed : parsed.app_jobs || parsed.jobs || [];
    } catch (err: any) {
      return NextResponse.json(
        { error: "Could not read scraped jobs file", details: err.message },
        { status: 400 }
      );
    }

    if (scrapedJobs.length === 0) {
      return NextResponse.json({ error: "No jobs found in file" }, { status: 400 });
    }

    const jobsToImport = scrapedJobs.slice(0, limit);

    const jobsWithUser = jobsToImport.map((job: any) => ({
      id: uuidv4(),
      user_id: userId,
      company: job.company || "Unknown Company",
      role: job.title || "Unknown Role",
      description: job.description || "",
      url: job.url || "",
      status: "new",
      created_at: new Date().toISOString(),
      salary: job.salary || null,
      location: job.location || null,
      work_type: job.remote ? "Remote" : null,
      job_type: null,
      experience_level: null,
      source: job.source || "company_careers",
      match_score: job.score || 0,
    }));

    const { data, error } = await supabase
      .from("jobs")
      .insert(jobsWithUser);

    if (error) {
      console.error("[DiscoverCompanies] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to import jobs", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: jobsWithUser.length,
      total_available: scrapedJobs.length,
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
    const filePath = join(process.cwd(), "app_jobs.json");
    let scrapedJobs;
    try {
      const fileContent = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(fileContent);
      scrapedJobs = Array.isArray(parsed) ? parsed : parsed.app_jobs || parsed.jobs || [];
    } catch {
      return NextResponse.json({
        available: 0,
        file_exists: false,
        message: "No scraped jobs file found. Run the scraper first.",
      });
    }

    return NextResponse.json({
      available: scrapedJobs.length,
      file_exists: true,
      message: "POST to this endpoint to import jobs",
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}