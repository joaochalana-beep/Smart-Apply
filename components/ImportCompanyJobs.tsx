"use client";

import { useState } from "react";

export default function ImportCompanyJobs() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discover-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">Import Company Jobs</h3>
      <p className="text-sm text-gray-600 mb-3">
        Import 1,463 jobs from curated company career pages
      </p>
      <button
        onClick={handleImport}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Importing..." : "Import Jobs"}
      </button>
      {result && (
        <div className="mt-3 p-2 bg-white rounded text-sm">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}