export const CONFIG = {
  domain: "applywise.org",
  appName: "ApplyWise",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://applywise.org", // placeholder

  // Email settings
  emailFrom: "ApplyWise <applications@applywise.org>",
  emailNoReply: "no-reply@applywise.org",

  // Resend (will add API key tomorrow)
  resendApiKey: process.env.RESEND_API_KEY || "test_key",

  // Feature flags
  emailSendingEnabled: false, // toggle to true when domain ready
};
