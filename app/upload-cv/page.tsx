"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadCVPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("cv", file);

      const parseRes = await fetch("/api/parse-cv2", {

        method: "POST",
        body: formData,
      });
      const { rawText, error } = await parseRes.json();
      if (error) throw new Error(error);

      const aiRes = await fetch("/api/ai-parse-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const profile = await aiRes.json();
      setResult(profile);
    } catch (err) {
      setResult({ error: String(err) });
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-6">Upload Your CV</h1>
      
      <div className="max-w-xl">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4 block w-full text-sm text-zinc-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-zinc-900 file:text-white
            hover:file:bg-zinc-800"
        />

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-zinc-200 transition"
        >
          {loading ? "Processing..." : "Upload & Parse CV"}
        </button>

        {result && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Parsed Profile</h2>
            <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {!result.error && (
              <button
                onClick={() => router.push("/profile")}
                className="mt-4 bg-zinc-800 text-white px-4 py-2 rounded-full text-sm
                  hover:bg-zinc-700 transition"
              >
                Review & Edit Profile →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}