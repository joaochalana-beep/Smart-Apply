import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function getDefaultPeriods() {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return {
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: end.toISOString(),
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tier, status, current_period_start, current_period_end, cancel_at_period_end, applications_used_this_month, applications_reset_date, stripe_subscription_id, paypal_subscription_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Subscription GET] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profile) {
    const defaults = getDefaultPeriods();
    return NextResponse.json({
      tier: "free",
      status: "active",
      current_period_start: defaults.currentPeriodStart,
      current_period_end: defaults.currentPeriodEnd,
      cancel_at_period_end: false,
      applications_used_this_month: 0,
      applications_reset_date: defaults.currentPeriodStart,
    });
  }

  return NextResponse.json(profile);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  const update: Record<string, unknown> = {};
  if (body.tier !== undefined) update.tier = body.tier;
  if (body.status !== undefined) update.status = body.status;
  if (body.current_period_start !== undefined) update.current_period_start = body.current_period_start;
  if (body.current_period_end !== undefined) update.current_period_end = body.current_period_end;
  if (body.cancel_at_period_end !== undefined) update.cancel_at_period_end = body.cancel_at_period_end;
  if (body.applications_used_this_month !== undefined) update.applications_used_this_month = body.applications_used_this_month;
  if (body.applications_reset_date !== undefined) update.applications_reset_date = body.applications_reset_date;
  if (body.stripe_subscription_id !== undefined) update.stripe_subscription_id = body.stripe_subscription_id;
  if (body.paypal_subscription_id !== undefined) update.paypal_subscription_id = body.paypal_subscription_id;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("profiles")
      .update(update)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    const defaults = getDefaultPeriods();
    result = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        tier: "free",
        status: "active",
        current_period_start: defaults.currentPeriodStart,
        current_period_end: defaults.currentPeriodEnd,
        cancel_at_period_end: false,
        applications_used_this_month: 0,
        applications_reset_date: defaults.currentPeriodStart,
        ...update,
      })
      .select()
      .single();
  }

  if (result.error) {
    console.error("[Subscription POST] error:", result.error);
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
