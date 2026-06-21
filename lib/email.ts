import { Resend } from "resend";
import { CONFIG } from "./config";

const resend = new Resend(CONFIG.resendApiKey);

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}

export function getDefaultFromEmail(): string {
  return CONFIG.emailFrom;
}

/**
 * Primary application email sender.
 * Mock mode is active until the domain is verified and emailSendingEnabled is true.
 */
export async function sendApplicationEmail({
  to,
  from,
  replyTo,
  subject,
  body,
  attachments,
  jobId,
  applicationId,
}: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  body: string;
  attachments?: { filename: string; content: string }[];
  jobId: string;
  applicationId: string;
}) {
  // If email sending not enabled (domain not ready), log and return
  if (!CONFIG.emailSendingEnabled || CONFIG.resendApiKey === "test_key") {
    console.log("[EMAIL MOCK] Would send to:", to);
    console.log("[EMAIL MOCK] From:", from);
    console.log("[EMAIL MOCK] Reply-To:", replyTo);
    console.log("[EMAIL MOCK] Subject:", subject);
    console.log("[EMAIL MOCK] Job:", jobId, "Application:", applicationId);
    console.log("[EMAIL MOCK] Body:", body.substring(0, 200) + "...");

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      mock: true,
    };
  }

  // Real sending (will work when domain is ready)
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo,
      subject,
      html: body.replace(/\n/g, "<br>"),
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) throw error;

    return { success: true, messageId: data?.id, mock: false };
  } catch (err: any) {
    console.error("Email send failed:", err);
    return { success: false, error: err.message || String(err), mock: false };
  }
}

/**
 * HTML email template sent to companies.
 */
export function buildApplicationEmail({
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  companyName,
  coverLetter,
  atsScore,
  referenceNumber,
}: {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  companyName: string;
  coverLetter: string;
  atsScore: number;
  referenceNumber: string;
}): string {
  return `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Dear Hiring Manager,</p>

  <p>I am writing to express my strong interest in the <strong>${jobTitle}</strong>
  position at <strong>${companyName}</strong>.</p>

  <div style="margin: 20px 0; padding: 15px; border-left: 3px solid #6366f1; background: #f8f9fa;">
    ${coverLetter.replace(/\n/g, "<br>")}
  </div>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

  <p style="font-size: 14px; color: #666;">
    <strong>Application Details:</strong><br>
    • Position: ${jobTitle}<br>
    • Company: ${companyName}<br>
    • Reference: ${referenceNumber}<br>
    • ATS Optimization Score: ${atsScore}%<br>
    • Applied via: ApplyWise (applywise.org)
  </p>

  <p style="font-size: 14px; color: #666;">
    Please reply to this email or contact me directly:<br>
    📧 ${candidateEmail}<br>
    ${candidatePhone ? `📱 ${candidatePhone}<br>` : ""}
  </p>

  <p>Best regards,<br><strong>${candidateName}</strong></p>
</div>
  `.trim();
}

/**
 * Legacy helper: convert plain text to simple HTML.
 * Kept for backward compatibility with notification emails.
 */
export function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => (line.trim() ? `<p>${line}</p>` : "<br />"))
    .join("");
}

/**
 * Legacy generic email sender.
 * Prefer sendApplicationEmail for application submissions.
 */
export async function sendEmail({ to, subject, html, text, from, replyTo, attachments }: SendEmailParams) {
  if (!CONFIG.emailSendingEnabled || CONFIG.resendApiKey === "test_key") {
    console.log("[EMAIL MOCK] Legacy send to:", to, "Subject:", subject);
    return { id: `mock_${Date.now()}`, error: null };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const validRecipients = recipients.filter((r) => !!r && r.includes("@"));

  if (validRecipients.length === 0) {
    console.warn("[Email] No valid recipient email address provided.");
    return { id: null, error: "No valid recipient" };
  }

  try {
    const result = await resend.emails.send({
      from: from || getDefaultFromEmail(),
      to: validRecipients,
      replyTo,
      subject,
      html: html || text || "",
      text: text || html || "",
      attachments,
    });

    if (result.error) {
      console.error("[Email] Resend error:", result.error);
      return { id: null, error: result.error.message || "Resend error" };
    }

    console.log(`[Email] Sent to ${validRecipients.join(", ")}: ${subject}`);
    return { id: result.data?.id, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Email] Send failed:", message);
    return { id: null, error: message };
  }
}
