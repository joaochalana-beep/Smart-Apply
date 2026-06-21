-- Add reference number and HR email to applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS hr_email TEXT,
  ADD COLUMN IF NOT EXISTS company_type TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_reference_number ON applications(reference_number);
