import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendApplicationEmail, buildApplicationEmail } from "@/lib/email";
import { getCompanyHrEmail } from "@/lib/companies";
import { CONFIG } from "@/lib/config";

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

function generateReferenceNumber(companyName: string, candidateName: string): string {
  const companyCode = companyName.substring(0, 2).toUpperCase();
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  const initials = candidateName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return `${companyCode}-${year}-${random}-${initials}`;
}

function extractCompanyFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  // Fetch user profile for sender info
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, applywise_email, phone")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const candidateName = profile?.full_name || "Candidate";
  const candidateEmail = profile?.applywise_email || `${userId}@applywise.org`;
  const candidatePhone = profile?.phone || undefined;

  // Clean job id
  const cleanJobId = (id: string | undefined) =>
    id ? id.replace(/^company_/, "").replace(/^arbeitnow_/, "").replace(/^adzuna_/, "").replace(/^indeed_/, "") : null;

  const company = body.company || body.job?.company || extractCompanyFromUrl(body.job_url) || "Unknown Company";
  const role = body.role || body.job?.title || "Unknown Role";
  const coverLetter = body.cover_letter || body.coverLetter || "";
  const resumeText = body.resume_text || body.tailored_resume || "";
  const atsScore = body.ats_score || body.atsScore || 0;

  // Generate reference number
  const referenceNumber = generateReferenceNumber(company, candidateName);

  // Determine HR email
  const hrEmail = body.hr_email || body.recruiter_email || getCompanyHrEmail(company);

  // Build insert data
  const insertData: any = {
    user_id: userId,
    job_id: cleanJobId(body.job_id) || null,
    company,
    role,
    resume_text: resumeText || null,
    cover_letter: coverLetter || null,
    apply_method: body.method || body.apply_method || "manual",
    status: body.status || "sent",
    sent_at: new Date().toISOString(),
    reference_number: referenceNumber,
    hr_email: hrEmail,
    company_type: body.company_type || null,
  };

  if (body.notes) insertData.notes = body.notes;

  const { data, error } = await supabase.from("applications").insert(insertData).select().single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send application email (mock today, real tomorrow)
  try {
    const emailBody = buildApplicationEmail({
      candidateName,
      candidateEmail,
      candidatePhone,
      jobTitle: role,
      companyName: company,
      coverLetter,
      atsScore,
      referenceNumber,
    });

    await sendApplicationEmail({
      to: hrEmail,
      from: CONFIG.emailFrom,
      replyTo: candidateEmail,
      subject: `Application for ${role} — ${candidateName}`,
      body: emailBody,
      attachments: resumeText
        ? [
            {
              filename: `CV_${candidateName.replace(/\s+/g, "_")}_${role.replace(/\s+/g, "_")}_${company.replace(/\s+/g, "_")}.txt`,
              content: Buffer.from(resumeText).toString("base64"),
            },
          ]
        : undefined,
      jobId: insertData.job_id || data.id,
      applicationId: data.id,
    });
  } catch (emailErr) {
    console.error("[Applications] send email failed:", emailErr);
  }

  // Create inbox confirmation
  try {
    const applicationBody = [
      `✅ Your application has been sent to ${company}!`,
      "",
      "📋 Details:",
      `• Position: ${role}`,
      `• Sent to: ${hrEmail}`,
      `• Your email: ${candidateEmail}`,
      `• Reference: ${referenceNumber}`,
      `• ATS Score: ${atsScore}%`,
      "",
      "⏳ Waiting for company response...",
      "",
      "💡 Note: Company replies will arrive in your inbox here.",
    ].join("\n");

    await supabase.from("messages").insert({
      user_id: userId,
      application_id: data.id,
      job_title: role,
      company_name: company,
      subject: `Application for ${role} — ${candidateName}`,
      body: applicationBody,
      type: "application_sent",
      status: "read",
      from: `${candidateName} <${candidateEmail}>`,
      from_name: candidateName,
      to_email: hrEmail,
      to_name: company,
      sent_at: new Date().toISOString(),
      reference_number: referenceNumber,
      ats_score: atsScore,
      is_imported: false,
      has_reply: false,
    });
  } catch (msgErr) {
    console.error("[Applications] inbox message failed:", msgErr);
  }

  return NextResponse.json(data, { status: 201 });
}
