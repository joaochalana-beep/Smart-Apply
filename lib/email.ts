// Email sending utility using Resend.
// Set RESEND_API_KEY in your environment. Use a verified domain or the Resend test email.

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export function getDefaultFromEmail(): string {
  // Use a verified sender domain if available, otherwise fall back to Resend's onboarding domain.
  return process.env.FROM_EMAIL || "ApplyFlow <onboarding@resend.dev>";
}

export async function sendEmail({ to, subject, html, text, from }: SendEmailParams) {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set. Email not sent.");
    return { id: null, error: "RESEND_API_KEY not configured" };
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
      subject,
      html: html || text || "",
      text: text || html || "",
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

export function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => (line.trim() ? `<p>${line}</p>` : "<br />"))
    .join("");
}
