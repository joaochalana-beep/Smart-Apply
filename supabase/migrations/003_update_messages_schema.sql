-- Expand messages table for real email format
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS from_name TEXT,
  ADD COLUMN IF NOT EXISTS to_email TEXT,
  ADD COLUMN IF NOT EXISTS to_name TEXT,
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ats_score INTEGER;

-- Widen type enum to support real email flow
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('application_sent', 'company_reply', 'confirmation', 'interview', 'rejection', 'offer', 'screening', 'general', 'response', 'interview_invite', 'follow_up'));

-- Widen "from" column to store full email addresses, not just system/company
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_from_check;

-- Indexes for inbound webhook lookups
CREATE INDEX IF NOT EXISTS idx_messages_reference_number ON messages(reference_number);
CREATE INDEX IF NOT EXISTS idx_messages_import_source ON messages(import_source);
