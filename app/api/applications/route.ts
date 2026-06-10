import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// GET — fetch all applications for the current user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data || []);
}

// POST — save a new application
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      job_id: body.job_id,
      company: body.company,
      role: body.role,
      method: body.method,
      status: body.status || "sent",
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}