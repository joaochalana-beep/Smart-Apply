import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  // Fetch user's applications
  const { data: applications, error: appsError } = await supabase
    .from("applications")
    .select("id, company, role, status, sent_at")
    .eq("user_id", userId);

  if (appsError) {
    console.error("[Messages Seed] applications error:", appsError);
    return NextResponse.json({ error: appsError.message }, { status: 500 });
  }

  // Fetch existing messages so we don't duplicate per application
  const { data: existingMessages, error: msgError } = await supabase
    .from("messages")
    .select("application_id, type")
    .eq("user_id", userId);

  if (msgError) {
    console.error("[Messages Seed] messages error:", msgError);
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  const existingKeys = new Set(
    (existingMessages || []).map((m) => `${m.application_id}:${m.type}`)
  );

  const messagesToInsert: any[] = [];
  const now = Date.now();

  for (const app of applications || []) {
    const company = app.company || "Unknown Company";
    const role = app.role || "Unknown Role";
    const sentAt = new Date(app.sent_at || Date.now()).getTime();
    const ageMs = now - sentAt;

    if (app.status === "sent" || app.status === "viewed") {
      // Confirmation message
      const key = `${app.id}:confirmation`;
      if (!existingKeys.has(key)) {
        messagesToInsert.push({
          user_id: userId,
          application_id: app.id,
          job_title: role,
          company_name: company,
          subject: `Application sent to ${company}`,
          body: `Your application for ${role} at ${company} has been submitted successfully. Good luck!`,
          type: "confirmation",
          status: "read",
          from: "system",
          sent_at: app.sent_at || new Date().toISOString(),
        });
        existingKeys.add(key);
      }

      // Follow-up reminder for older applications
      if (ageMs > THREE_DAYS_MS) {
        const followUpKey = `${app.id}:follow_up`;
        if (!existingKeys.has(followUpKey)) {
          const daysAgo = Math.floor(ageMs / (24 * 60 * 60 * 1000));
          messagesToInsert.push({
            user_id: userId,
            application_id: app.id,
            job_title: role,
            company_name: company,
            subject: `Follow-up reminder for ${company} application`,
            body: `It's been ${daysAgo} days since you applied to the ${role} role at ${company}. Consider sending a polite follow-up email to the hiring manager if you haven't heard back.`,
            type: "follow_up",
            status: "unread",
            from: "system",
            sent_at: new Date(sentAt + THREE_DAYS_MS).toISOString(),
          });
          existingKeys.add(followUpKey);
        }
      }
    }

    if (app.status === "interview") {
      const key = `${app.id}:interview_invite`;
      if (!existingKeys.has(key)) {
        messagesToInsert.push({
          user_id: userId,
          application_id: app.id,
          job_title: role,
          company_name: company,
          subject: `Interview Invitation from ${company}`,
          body: `Hi there,\n\nThank you for your application for the ${role} position at ${company}. We were impressed by your profile and would like to invite you to a first-round video interview.\n\nPlease let us know your availability over the next few days.\n\nBest regards,\n${company} Recruiting`,
          type: "interview_invite",
          status: "unread",
          from: "company",
          sent_at: app.sent_at || new Date().toISOString(),
        });
        existingKeys.add(key);
      }
    }

    if (app.status === "rejected") {
      const key = `${app.id}:rejection`;
      if (!existingKeys.has(key)) {
        messagesToInsert.push({
          user_id: userId,
          application_id: app.id,
          job_title: role,
          company_name: company,
          subject: `Application update from ${company}`,
          body: `Thank you for your interest in the ${role} role at ${company}. After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.\n\nWe wish you all the best in your job search.`,
          type: "rejection",
          status: "read",
          from: "company",
          sent_at: app.sent_at || new Date().toISOString(),
        });
        existingKeys.add(key);
      }
    }
  }

  if (messagesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("messages")
      .insert(messagesToInsert);

    if (insertError) {
      console.error("[Messages Seed] insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ seeded: messagesToInsert.length });
}
