import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Polyfill DOMMatrix for pdf-parse/pdfjs-dist
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: any) {
      if (typeof init === 'string') {
        const parts = init.match(/matrix\(([^)]+)\)/);
        if (parts) {
          const vals = parts[1].split(',').map((v: string) => parseFloat(v.trim()));
          [this.a, this.b, this.c, this.d, this.e, this.f] = vals;
        }
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    toString() { return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`; }
  };
}

const pdfParse = require("pdf-parse");

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

    const parsed = await pdfParse(buffer);
    const text = parsed.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "PDF contains no extractable text" }, { status: 400 });
    }

    return NextResponse.json({ rawText: text });

  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}