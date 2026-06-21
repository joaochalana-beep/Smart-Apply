-- Add ApplyWise email fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS applywise_email TEXT,
  ADD COLUMN IF NOT EXISTS personal_email TEXT;

-- Index for looking up users by their ApplyWise email (used by inbound email webhook)
CREATE INDEX IF NOT EXISTS idx_profiles_applywise_email ON profiles(applywise_email);
