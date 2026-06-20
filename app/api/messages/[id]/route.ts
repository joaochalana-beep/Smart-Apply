import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const update: Record<string, any> = {};
  if (body.status === "read" || body.status === "unread") update.status = body.status;

  const { data, error } = await supabase
    .from("messages")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[Messages PATCH] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[Messages DELETE] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
