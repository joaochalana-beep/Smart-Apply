"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadCVPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  async function extractTextFromPDF(file: File): Promise<string> {
    // Dynamically import pdfjs-dist only in browser
    const pdfjs = await import("pdfjs-dist");
    
    // Set worker source
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);

    try {
      const rawText = await extractTextFromPDF(file);
      
      const aiRes = await fetch("/api/ai-parse-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      
      const profile = await aiRes.json();
      if (profile.error) throw new Error(profile.error);
      
      setResult(profile);
    } catch (err: any) {
      setResult({ error: err.message });
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Upload Your CV</h1>

        <div className="space-y-4 mb-8">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-zinc-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-medium
              file:bg-zinc-800 file:text-white
              hover:file:bg-zinc-700"
          />
          {file && <p className="text-zinc-400 text-sm">{file.name}</p>}
          
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium disabled:opacity-50 hover:bg-zinc-200 transition"
          >
            {loading ? "Parsing..." : "Upload & Parse CV"}
          </button>
        </div>

        {result && !result.error && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Parsed Profile</h2>
            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            <button
              onClick={() => router.push("/profile")}
              className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition"
            >
              Review & Edit Profile →
            </button>
          </div>
        )}

        {result?.error && (
          <div className="bg-red-900/50 border border-red-800 rounded-lg p-4 text-red-400">
            Error: {result.error}
          </div>
        )}
      </div>
    </div>
  );
}