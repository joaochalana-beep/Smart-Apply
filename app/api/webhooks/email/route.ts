import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  findApplicationByReference,
  createInboxMessage,
  updateApplicationStatus,
  markMessageHasReply,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Optional token check to protect the webhook
    const token = req.nextUrl.searchParams.get("token");
    const expected = process.env.WEBHOOK_SECRET;
    if (expected && token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = await req.json();

    const { from, to, subject, text, html } = email;

    if (!to || !from) {
      return NextResponse.json({ error: "Missing from or to" }, { status: 400 });
    }

    // Extract user's ApplyWise email from "to" field
    const userEmail = extractEmailAddress(to);
    const user = await findUserByEmail(userEmail);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract reference number from subject/body
    const referenceMatch = ((subject || "") + " " + (text || "")).match(
      /([A-Z]{2,4}-\d{4}-\d{5,}-[A-Z]{2})/
    );
    const referenceNumber = referenceMatch ? referenceMatch[0] : null;

    // Find matching application
    let application = null;
    if (referenceNumber) {
      application = await findApplicationByReference(referenceNumber);
    }

    // Classify email type
    const type = classifyEmailType(subject, text);

    // Store in inbox as a company reply
    await createInboxMessage({
      userId: user.user_id,
      applicationId: application?.id,
      jobTitle: application?.role || "Unknown Role",
      companyName: application?.company || extractName(from),
      from: from,
      fromName: extractName(from),
      to: userEmail,
      subject: subject || "No subject",
      body: text || html || "",
      type: type as any,
      status: "unread",
      sentAt: new Date().toISOString(),
      referenceNumber: referenceNumber,
      isImported: true,
      importSource: "resend_inbound",
    });

    // Update application status if matched
    if (application) {
      const newStatus = parseStatusFromEmail(subject, text);
      if (newStatus !== application.status) {
        await updateApplicationStatus(application.id, newStatus);
      }
      await markMessageHasReply(application.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Helper: classify email type
function classifyEmailType(subject: string, body: string): string {
  const text = ((subject || "") + " " + (body || "")).toLowerCase();

  if (text.includes("interview") || text.includes("schedule") || text.includes("calendar"))
    return "interview";
  if (
    text.includes("unfortunately") ||
    text.includes("not moving forward") ||
    text.includes("regret")
  )
    return "rejection";
  if (
    text.includes("offer") ||
    text.includes("congratulations") ||
    text.includes("pleased to offer")
  )
    return "offer";
  if (text.includes("screening") || text.includes("phone call") || text.includes("assessment"))
    return "screening";
  if (
    text.includes("received") ||
    text.includes("thank you for applying") ||
    text.includes("confirm")
  )
    return "confirmation";

  return "company_reply";
}

// Helper: parse status from email
function parseStatusFromEmail(subject: string, body: string): string {
  const text = ((subject || "") + " " + (body || "")).toLowerCase();

  if (text.includes("offer")) return "offer";
  if (text.includes("interview")) return "interview";
  if (text.includes("unfortunately") || text.includes("rejected") || text.includes("regret"))
    return "rejected";
  if (text.includes("screening") || text.includes("assessment")) return "screening";

  return "applied";
}

// Helper: extract name from email address "Name <email>"
function extractName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  return match ? match[1].trim() : from;
}

// Helper: extract bare email address if wrapped in angle brackets
function extractEmailAddress(to: string): string {
  const match = to.match(/<([^>]+)>/);
  return match ? match[1].trim() : to.trim();
}
