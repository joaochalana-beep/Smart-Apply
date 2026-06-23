import { Resend } from "resend";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local missing or unsupported; rely on existing env vars
}

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey || apiKey.trim() === "" || apiKey === "test_key") {
  console.error("❌ RESEND_API_KEY is not set. Add it to .env.local and try again.");
  process.exit(1);
}

const resend = new Resend(apiKey);
const from = process.env.RESEND_FROM_EMAIL || "ApplyWise <applications@applywise.site>";
const to = "joao.chalana@gmail.com";

console.log("Sending test email from", from, "to", to);

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: "ApplyWise Email Test",
  text: "If you received this, email sending is working!",
  html: "<p>If you received this, email sending is working!</p>",
});

if (error) {
  console.error("❌ Test email failed:", error);
  process.exit(1);
}

console.log("✅ Test email sent. Message ID:", data?.id);
