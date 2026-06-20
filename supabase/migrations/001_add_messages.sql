-- Messages table for the Inbox feature
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL DEFAULT 'Unknown Role',
  company_name TEXT NOT NULL DEFAULT 'Unknown Company',
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('confirmation', 'response', 'interview_invite', 'rejection', 'offer', 'follow_up')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
  "from" TEXT NOT NULL DEFAULT 'system' CHECK ("from" IN ('system', 'company')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_application_id ON messages(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);

-- Row Level Security: users can only see/modify their own messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_messages ON messages
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY insert_own_messages ON messages
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY update_own_messages ON messages
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY delete_own_messages ON messages
  FOR DELETE USING (auth.uid()::text = user_id);
