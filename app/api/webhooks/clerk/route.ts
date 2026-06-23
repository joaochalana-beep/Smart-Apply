import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateUserEmail } from "@/lib/user-email";

/**
 * Clerk webhook: automatically create a Supabase profile with an
 * @applywise.site email address as soon as a user signs up.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify Svix signature
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(webhookSecret);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any;
  } catch (err: any) {
    console.error("[Clerk Webhook] verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only handle user creation
  if (evt.type !== "user.created") {
    return NextResponse.json({ success: true, ignored: evt.type });
  }

  const { id: userId, email_addresses, first_name, last_name, username } = evt.data;

  const primaryEmail = email_addresses?.find((e: any) => e.id === evt.data.primary_email_address_id)?.email_address
    || email_addresses?.[0]?.email_address
    || "";

  const fullName = [first_name, last_name].filter(Boolean).join(" ").trim()
    || username
    || "Candidate";

  const applywiseEmail = generateUserEmail(fullName);

  const supabase = await createClient();

  // Avoid duplicate profiles
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, alreadyExists: true, applywiseEmail });
  }

  const { error } = await supabase.from("profiles").insert({
    user_id: userId,
    full_name: fullName,
    email: primaryEmail,
    personal_email: primaryEmail,
    applywise_email: applywiseEmail,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[Clerk Webhook] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Clerk Webhook] Created profile for ${userId} with email ${applywiseEmail}`);
  return NextResponse.json({ success: true, applywiseEmail });
}
