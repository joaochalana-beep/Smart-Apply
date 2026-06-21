-- Add company HR email and type to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS hr_email TEXT,
  ADD COLUMN IF NOT EXISTS company_type TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_company_type ON jobs(company_type);
