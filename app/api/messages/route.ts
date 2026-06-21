import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendEmail, textToHtml } from "@/lib/email";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("[Messages GET] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  const insert = {
    user_id: userId,
    application_id: body.application_id || null,
    job_title: body.job_title || "Unknown Role",
    company_name: body.company_name || "Unknown Company",
    subject: body.subject || "",
    body: body.body || "",
    type: body.type || "company_reply",
    status: body.status || "unread",
    from: body.from || "ApplyWise <applications@applywise.org>",
    from_name: body.from_name || null,
    to_email: body.to_email || null,
    to_name: body.to_name || null,
    sent_at: body.sent_at || new Date().toISOString(),
    reference_number: body.reference_number || null,
    ats_score: body.ats_score || null,
    is_imported: body.is_imported ?? false,
    import_source: body.import_source || null,
    has_reply: body.has_reply ?? false,
  };

  const { data, error } = await supabase.from("messages").insert(insert).select().single();

  if (error) {
    console.error("[Messages POST] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optional: notify the user by email for important company replies
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, personal_email, full_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const userEmail = profile?.personal_email || profile?.email;
    const isReply = data.type === "company_reply" || data.type === "interview" || data.type === "offer" || data.type === "rejection";

    if (userEmail && isReply) {
      const subject = `New reply: ${data.subject}`;
      const text =
        `Hi ${profile?.full_name || "there"},\n\n` +
        `You have a new reply from ${data.company_name} regarding the ${data.job_title} position.\n\n` +
        `${data.body}\n\n` +
        `View it in your ApplyWise inbox: ${process.env.NEXT_PUBLIC_APP_URL || ""}/inbox\n\n` +
        `- ApplyWise`;

      await sendEmail({
        to: userEmail,
        subject,
        text,
        html: textToHtml(text),
        from: `${data.company_name} via ApplyWise <applications@applywise.org>`,
      });
    }
  } catch (emailErr) {
    console.error("[Messages] notification email failed:", emailErr);
  }

  return NextResponse.json(data, { status: 201 });
}
