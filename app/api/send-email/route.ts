import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sendEmail, textToHtml } from "@/lib/email";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { to, subject, text, html } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, text or html" },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      subject,
      text,
      html: html || textToHtml(text),
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
