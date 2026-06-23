export const CONFIG = {
  domain: "applywise.site",
  appName: "ApplyWise",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://applywise.site",

  // Email settings
  emailFrom: "ApplyWise <applications@applywise.site>",
  emailNoReply: "no-reply@applywise.site",

  // Resend API key (set in .env.local)
  resendApiKey: process.env.RESEND_API_KEY || "test_key",

  // Feature flags
  emailSendingEnabled: true,
};
