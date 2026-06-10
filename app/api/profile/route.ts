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
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] || null);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  // Remove id and user_id from body if present (we set user_id manually)
  const { id, user_id, ...profileData } = body;

  // Check if profile exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  let result;
  if (existing) {
    // Update existing
    result = await supabase
      .from("profiles")
      .update(profileData)
      .eq("user_id", userId)
      .select()
      .single();
  } else {
    // Insert new
    result = await supabase
      .from("profiles")
      .insert({ ...profileData, user_id: userId })
      .select()
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data);
}