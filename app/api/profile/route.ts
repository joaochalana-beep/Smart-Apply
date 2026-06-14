import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Multiple rows found — return the most recent one instead of failing
      const { data: rows } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      return NextResponse.json(rows?.[0] || null);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || null);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  // Check if profile exists (handle duplicates gracefully)
  let existing: any = null;
  const { data: existingData, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      // Multiple rows — grab the most recent id
      const { data: rows } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      existing = rows?.[0] || null;
    } else {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
  } else {
    existing = existingData;
  }

  let result;
  if (existing) {
    // Update the specific existing profile by ID
    result = await supabase
      .from("profiles")
      .update(body)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    // Insert new
    result = await supabase
      .from("profiles")
      .insert({ ...body, user_id: userId })
      .select()
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data);
}