import { createClient } from "@/utils/supabase/server";

export interface InboxMessageInput {
  userId: string;
  applicationId?: string;
  jobTitle?: string;
  companyName?: string;
  from: string;
  fromName?: string;
  to: string;
  toName?: string;
  subject: string;
  body: string;
  type: string;
  status?: string;
  sentAt?: string;
  referenceNumber?: string | null;
  atsScore?: number;
  isImported?: boolean;
  importSource?: string | null;
  hasReply?: boolean;
}

export async function findUserByEmail(email: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, applywise_email, personal_email, email")
    .eq("applywise_email", email)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[findUserByEmail] error:", error);
    return null;
  }
  return data;
}

export async function findApplicationByReference(referenceNumber: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("id, user_id, company, role, status, reference_number")
    .eq("reference_number", referenceNumber)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[findApplicationByReference] error:", error);
    return null;
  }
  return data;
}

export async function createInboxMessage(input: InboxMessageInput) {
  const supabase = await createClient();
  const insert = {
    user_id: input.userId,
    application_id: input.applicationId || null,
    job_title: input.jobTitle || "Unknown Role",
    company_name: input.companyName || "Unknown Company",
    from: input.from,
    from_name: input.fromName || null,
    to_email: input.to,
    to_name: input.toName || null,
    subject: input.subject || "",
    body: input.body || "",
    type: input.type,
    status: input.status || "unread",
    sent_at: input.sentAt || new Date().toISOString(),
    reference_number: input.referenceNumber || null,
    ats_score: input.atsScore || null,
    is_imported: input.isImported ?? false,
    import_source: input.importSource || null,
    has_reply: input.hasReply ?? false,
  };

  const { data, error } = await supabase.from("messages").insert(insert).select().single();
  if (error) {
    console.error("[createInboxMessage] error:", error);
    throw error;
  }
  return data;
}

export async function updateApplicationStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  if (error) {
    console.error("[updateApplicationStatus] error:", error);
    throw error;
  }
}

export async function markMessageHasReply(applicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ has_reply: true })
    .eq("application_id", applicationId)
    .eq("type", "application_sent");
  if (error) {
    console.error("[markMessageHasReply] error:", error);
  }
}
