console.log("=== DEBUG START ===");
console.log("Node version:", process.version);
console.log("CWD:", process.cwd());

try {
  require("@supabase/supabase-js");
  console.log("✅ @supabase/supabase-js found");
} catch (e) {
  console.error("❌ @supabase/supabase-js NOT found");
}

console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅" : "❌");
console.log("KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌");
console.log("=== DEBUG END ===");