// Load env vars from .env.local
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const envContent = fs.readFileSync(".env.local", "utf-8");
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    const value = valueParts.join("=").trim();
    if (value && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
});

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 500;

const platformToSource = {
  "greenhouse": "company_careers_greenhouse",
  "lever": "company_careers_lever",
  "workday": "company_careers_workday",
  "unknown": "company_careers_unknown",
};

function findJobsFile() {
  const possibleFiles = [
    path.join(process.cwd(), "app_jobs.json"),
    path.join(process.cwd(), "scraped_jobs.json"),
    path.join(process.cwd(), "combined_jobs.json"),
  ];

  let bestFile = null;
  let bestJobs = [];

  for (const filePath of possibleFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(fileContent);
      const jobs = Array.isArray(parsed) ? parsed : (parsed.jobs || parsed.app_jobs || []);
      
      if (jobs.length > bestJobs.length) {
        bestFile = filePath;
        bestJobs = jobs;
      }
    } catch {
      // Skip
    }
  }

  return { filePath: bestFile, jobs: bestJobs };
}

async function importJobs() {
  const { filePath, jobs: scrapedJobs } = findJobsFile();

  if (!filePath) {
    console.error("No jobs file found!");
    return;
  }

  console.log(`📁 Using file: ${filePath}`);
  console.log(`📊 Found ${scrapedJobs.length} jobs in file\n`);

  // Deduplicate by URL
  const uniqueJobs = new Map();
  for (const job of scrapedJobs) {
    const url = job.url || job.job_url || job.apply_url || job.link || "";
    if (!url) continue;
    if (!uniqueJobs.has(url)) {
      uniqueJobs.set(url, job);
    }
  }

  const dedupedJobs = Array.from(uniqueJobs.values());
  console.log(`✅ ${dedupedJobs.length} unique jobs (${scrapedJobs.length - dedupedJobs.length} duplicates removed)\n`);

  // Map to database format
  const jobsToInsert = dedupedJobs.map((job) => ({
    id: randomUUID(),
    user_id: null,
    company: job.company || job.company_name || "Unknown Company",
    role: job.title || job.role || job.job_title || "Unknown Role",
    description: job.description || job.job_description || "",
    url: job.url || job.job_url || job.apply_url || job.link || "",
    status: "new",
    created_at: job.posted_at || job.scraped_at || new Date().toISOString(),
    salary: job.salary || job.compensation || null,
    location: job.location || job.locations || job.city || null,
    work_type: job.is_remote ? "Remote" : job.remote ? "Remote" : "On-site",
    job_type: job.job_type || "Full-time",
    experience_level: job.experience_level || null,
    source: platformToSource[(job.platform || job.source || "unknown").toLowerCase()] || "company_careers_unknown",
    match_score: 0,
  }));

  // Batch insert
  let totalImported = 0;
  for (let i = 0; i < jobsToInsert.length; i += BATCH_SIZE) {
    const batch = jobsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`\n❌ Batch failed:`, error);
      return;
    }
    totalImported += batch.length;
    process.stdout.write(`\r📥 Progress: ${totalImported}/${jobsToInsert.length}`);
  }

  console.log(`\n\n✅ Imported ${totalImported} unique jobs!`);

  // Verify
  const { count } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true });
  console.log(`📊 Database now has ${count} total jobs`);
}

importJobs();