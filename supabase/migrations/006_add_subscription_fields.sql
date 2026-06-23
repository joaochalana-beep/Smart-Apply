-- Add subscription fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS applications_used_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applications_reset_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- Constraint for valid tiers
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'starter', 'pro', 'elite'));

-- Constraint for valid statuses
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing'));
