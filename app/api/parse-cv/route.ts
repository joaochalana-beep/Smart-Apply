import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist";

// Disable worker for serverless environment
(pdfjs as any).GlobalWorkerOptions.disableWorker = true;

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
    const uint8Array = new Uint8Array(bytes);

    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json({ error: "PDF contains no extractable text" }, { status: 400 });
    }

    return NextResponse.json({ rawText: fullText });

  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}