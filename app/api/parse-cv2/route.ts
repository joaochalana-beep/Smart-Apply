import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function extractTextFromPDF(buffer: Buffer): string {
  // Convert buffer to string using latin1 to preserve byte values
  const content = buffer.toString("latin1");
  
  // Method 1: Extract text from BT/ET blocks (standard PDF text)
  const btBlocks = content.match(/BT[\s\S]*?ET/g);
  let text = "";
  
  if (btBlocks) {
    for (const block of btBlocks) {
      // Extract text from Tj operator: (text)Tj
      const tjMatches = block.match(/\(([^)]{1,500})\)\s*Tj/g);
      if (tjMatches) {
        for (const match of tjMatches) {
          const textMatch = match.match(/\(([^)]{1,500})\)/);
          if (textMatch) {
            text += textMatch[1] + " ";
          }
        }
      }
      
      // Extract text from TJ array: [(text1)(text2)]TJ
      const tjArrayMatches = block.match(/\[\s*(?:\([^)]{0,500}\)\s*)+\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const arrMatch of tjArrayMatches) {
          const innerMatches = arrMatch.match(/\(([^)]{0,500})\)/g);
          if (innerMatches) {
            for (const inner of innerMatches) {
              const txt = inner.match(/\(([^)]{0,500})\)/);
              if (txt) text += txt[1];
            }
            text += " ";
          }
        }
      }
    }
  }
  
  // Method 2: Fallback - look for text streams
  if (!text.trim()) {
    const streamMatches = content.match(/stream[\s\S]*?endstream/g);
    if (streamMatches) {
      for (const stream of streamMatches) {
        const clean = stream
          .replace(/stream\s*/, "")
          .replace(/\s*endstream/, "")
          .replace(/[^\x20-\x7E\s]/g, " ");
        if (clean.length > 50 && clean.includes(" ")) {
          text += clean + " ";
        }
      }
    }
  }
  
  // Clean up the extracted text
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\\/g, "\\")
    .replace(/\x00/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

    const text = extractTextFromPDF(buffer);

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: "PDF contains no extractable text. If this is a scanned/image PDF, please paste the text manually." 
      }, { status: 400 });
    }

    return NextResponse.json({ rawText: text });

  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}