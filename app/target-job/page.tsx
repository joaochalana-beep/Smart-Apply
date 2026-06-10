"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TargetJobPage() {
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  async function generateTailoredDocs() {
    if (!jobDescription.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/generate-tailored-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobUrl,
          jobDescription,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    }

    setLoading(false);
  }

  async function saveApplication() {
    if (!result) return;
    
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: result.jobId,
          company: result.jobCompany || "Unknown Company",
          role: result.jobRole || "Unknown Role",
          resume_text: result.resume,
          cover_letter: result.coverLetter,
          method: "manual",
        }),
      });
      const data = await res.json();
      alert("Application saved to your tracker!");
      router.push("/applications");
    } catch (err) {
      alert("Failed to save application");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Target a Job</h1>
        <p className="text-zinc-400 mb-8">
          Paste a job description and we'll generate a tailored resume and cover letter.
        </p>

        {/* Job Input */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Job URL (optional)</label>
            <input
              type="text"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://company.com/careers/job-123"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>
          
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Job Description *</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={8}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>

          <button
            onClick={generateTailoredDocs}
            disabled={loading || !jobDescription.trim()}
            className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium disabled:opacity-50 hover:bg-zinc-200 transition"
          >
            {loading ? "Generating..." : "Generate Tailored Documents"}
          </button>
        </div>

        {/* Results */}
        {result && !result.error && (
          <div className="space-y-6">
            {/* Job Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">{result.jobRole}</h2>
              <p className="text-zinc-400 text-sm">{result.jobCompany}</p>
            </div>

            {/* Tailored Resume */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Tailored Resume</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(result.resume)}
                  className="text-sm bg-zinc-800 text-white px-3 py-1 rounded hover:bg-zinc-700 transition"
                >
                  Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
                {result.resume}
              </pre>
            </div>

            {/* Cover Letter */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Cover Letter</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(result.coverLetter)}
                  className="text-sm bg-zinc-800 text-white px-3 py-1 rounded hover:bg-zinc-700 transition"
                >
                  Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
                {result.coverLetter}
              </pre>
            </div>

            {/* Skills Match */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Skills Match</h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills?.map((skill: string, i: number) => (
                  <span key={i} className="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-sm">
                    ✓ {skill}
                  </span>
                ))}
                {result.missingSkills?.map((skill: string, i: number) => (
                  <span key={i} className="bg-red-900/50 text-red-400 px-3 py-1 rounded-full text-sm">
                    ✗ {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={saveApplication}
                className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition"
              >
                Save to Application Tracker
              </button>
              <button
                onClick={() => router.push("/profile")}
                className="bg-zinc-800 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-700 transition"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}

        {result?.error && (
          <div className="bg-red-900/50 border border-red-800 rounded-lg p-6 text-red-400">
            Error: {result.error}
          </div>
        )}
      </div>
    </div>
  );
}