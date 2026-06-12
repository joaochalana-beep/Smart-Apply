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

    // Extract text with better structure preservation
    const text = await new Promise<string>((resolve, reject) => {
      let fullText = "";
      let currentLine = "";
      let lastY: number | null = null;
      const allText: string[] = [];
      
      new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
        if (err) {
          reject(err);
        } else if (!item) {
          // End of file - add last line
          if (currentLine.trim()) {
            fullText += currentLine.trim() + "\n";
            allText.push(currentLine.trim());
          }
          
          // Also try to extract any text we might have missed
          // by looking at the raw buffer for common patterns
          const rawText = buffer.toString("utf8");
          const emailMatches = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          const phoneMatches = rawText.match(/(?:\+?\d{1,3}[-.]?)?\(?\d{2,4}\)?[-.]?\d{3,5}[-.]?\d{3,5}/g);
          
          let headerInfo = "";
          if (emailMatches) {
            headerInfo += "Email: " + emailMatches[0] + "\n";
          }
          if (phoneMatches) {
            headerInfo += "Phone: " + phoneMatches[0] + "\n";
          }
          
          if (headerInfo && !fullText.includes(emailMatches?.[0] || "")) {
            fullText = headerInfo + "\n" + fullText;
          }
          
          resolve(fullText.trim());
        } else if (item.text) {
          // Group text by Y position (same line)
          if (lastY !== null && Math.abs(item.y - lastY) > 0.5) {
            if (currentLine.trim()) {
              fullText += currentLine.trim() + "\n";
              allText.push(currentLine.trim());
            }
            currentLine = item.text;
          } else {
            currentLine += " " + item.text;
          }
          lastY = item.y;
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
