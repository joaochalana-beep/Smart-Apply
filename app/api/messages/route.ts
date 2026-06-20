import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("[Messages GET] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  const insert = {
    user_id: userId,
    application_id: body.application_id || null,
    job_title: body.job_title || "Unknown Role",
    company_name: body.company_name || "Unknown Company",
    subject: body.subject || "",
    body: body.body || "",
    type: body.type || "response",
    status: body.status || "unread",
    from: body.from || "system",
    sent_at: body.sent_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error("[Messages POST] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
