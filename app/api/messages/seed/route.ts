import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Seed inbox with application_sent confirmations for existing applications.
 * No simulated company replies — only real inbound webhooks create those.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const { data: applications, error: appsError } = await supabase
    .from("applications")
    .select("id, company, role, status, sent_at, reference_number")
    .eq("user_id", userId);

  if (appsError) {
    console.error("[Messages Seed] applications error:", appsError);
    return NextResponse.json({ error: appsError.message }, { status: 500 });
  }

  const { data: existingMessages, error: msgError } = await supabase
    .from("messages")
    .select("application_id, type")
    .eq("user_id", userId);

  if (msgError) {
    console.error("[Messages Seed] messages error:", msgError);
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  const existingKeys = new Set((existingMessages || []).map((m) => `${m.application_id}:${m.type}`));

  const messagesToInsert: any[] = [];

  for (const app of applications || []) {
    const company = app.company || "Unknown Company";
    const role = app.role || "Unknown Role";
    const key = `${app.id}:application_sent`;

    if (!existingKeys.has(key)) {
      messagesToInsert.push({
        user_id: userId,
        application_id: app.id,
        job_title: role,
        company_name: company,
        subject: `Application for ${role} — ${company}`,
        body: `Your application for ${role} at ${company} has been sent successfully.\n\nReference: ${
          app.reference_number || "N/A"
        }\n\nWe will notify you when the employer responds.`,
        type: "application_sent",
        status: "read",
        from: "ApplyWise <applications@applywise.site>",
        from_name: "ApplyWise",
        sent_at: app.sent_at || new Date().toISOString(),
        reference_number: app.reference_number || null,
      });
      existingKeys.add(key);
    }
  }

  if (messagesToInsert.length > 0) {
    const { error: insertError } = await supabase.from("messages").insert(messagesToInsert);

    if (insertError) {
      console.error("[Messages Seed] insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ seeded: messagesToInsert.length });
}
