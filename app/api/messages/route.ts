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
    type: body.type || "response",
    status: body.status || "unread",
    from: body.from || "system",
    sent_at: body.sent_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error("[Messages POST] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send real email for company responses and important system notifications
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const userEmail = profile?.email;
    const sender = data.from || "system";
    const isCompany = sender === "company";
    const isInterview = data.type === "interview_invite";
    const isOffer = data.type === "offer";
    const isRejection = data.type === "rejection";

    if (userEmail && (isCompany || isInterview || isOffer || isRejection)) {
      const fromName = isCompany ? data.company_name : "ApplyFlow";
      const subject = `${data.subject}`;
      const text =
        `Hi ${profile?.full_name || "there"},\n\n` +
        `You have a new message from ${fromName} regarding the ${data.job_title} position.\n\n` +
        `${data.body}\n\n` +
        `View it in your ApplyFlow inbox: ${process.env.NEXT_PUBLIC_APP_URL || ""}/inbox\n\n` +
        `- ${fromName}`;

      await sendEmail({
        to: userEmail,
        subject,
        text,
        html: textToHtml(text),
        from: isCompany
          ? `${data.company_name} via ApplyFlow <onboarding@resend.dev>`
          : undefined,
      });
    }
  } catch (emailErr) {
    console.error("[Messages] notification email failed:", emailErr);
  }

  return NextResponse.json(data, { status: 201 });
}
