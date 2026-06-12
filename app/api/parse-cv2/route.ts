import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { PdfReader } from "pdfreader";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("cv") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const text = await new Promise<string>((resolve, reject) => {
      let fullText = "";
      new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
        if (err) {
          reject(err);
        } else if (!item) {
          resolve(fullText);
        } else if (item.text) {
          fullText += item.text + " ";
        }
      });
    });

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "PDF contains no extractable text" }, { status: 400 });
    }

    return NextResponse.json({ rawText: text });

  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}