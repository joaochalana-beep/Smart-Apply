import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

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

    const pdfParser = new PDFParser();
    
    const text = await new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(new Error(errData.parserError));
      });
      
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        const rawText = pdfData.Pages.map((page: any) => 
          page.Texts.map((text: any) => decodeURIComponent(text.R[0].T)).join(" ")
        ).join("\n");
        resolve(rawText);
      });

      pdfParser.parseBuffer(buffer);
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