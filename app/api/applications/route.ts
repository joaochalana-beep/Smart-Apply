import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendEmail, textToHtml } from "@/lib/email";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  // Strip source prefixes (company_, arbeitnow_, adzuna_, indeed_) before storing
  // so UUID columns never receive prefixed IDs.
  const cleanJobId = (id: string | undefined) =>
    id ? id.replace(/^company_/, "").replace(/^arbeitnow_/, "").replace(/^adzuna_/, "").replace(/^indeed_/, "") : null;

  // Build insert with all available fields, with fallbacks
  const insertData: any = {
    user_id: userId,
    job_id: cleanJobId(body.job_id) || null,
    company: body.company || body.job?.company || extractCompanyFromUrl(body.job_url) || "Unknown Company",
    role: body.role || body.job?.title || "Unknown Role",
    resume_text: body.resume_text || body.tailored_resume || null,
    cover_letter: body.cover_letter || null,
    apply_method: body.method || body.apply_method || "manual",
    status: body.status || "sent",
    sent_at: new Date().toISOString(),
  };

  // Optional fields
  if (body.notes) insertData.notes = body.notes;
  if (body.recruiter_email) insertData.recruiter_email = body.recruiter_email;

  const { data, error } = await supabase
    .from("applications")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send real email confirmation to the user
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const userEmail = profile?.email || body.user_email;
    if (userEmail) {
      const company = data.company || "the company";
      const role = data.role || "the role";
      const subject = `Application submitted to ${company} for ${role}`;
      const text =
        `Hi ${profile?.full_name || "there"},\n\n` +
        `Your ATS-optimized application for ${role} at ${company} has been submitted successfully.\n\n` +
        `ATS Score: ${body.ats_score || "N/A"}\n` +
        `Submitted on: ${new Date(data.sent_at).toLocaleString()}\n\n` +
        `We will notify you when the employer responds. Good luck!\n\n` +
        `- ApplyFlow`;

      await sendEmail({
        to: userEmail,
        subject,
        text,
        html: textToHtml(text),
      });
    }
  } catch (emailErr) {
    console.error("[Applications] confirmation email failed:", emailErr);
  }

  return NextResponse.json(data, { status: 201 });
}

function extractCompanyFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    // Extract company from common job board URLs
    // e.g., adzuna.co.uk, indeed.com, linkedin.com/jobs/view/...
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
  } catch {
    // ignore
  }
  return null;
}