"use client";

import { useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function testSave() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: 'Test User',
          email: 'test@test.com',
          skills: 'React, Next.js',
          location: 'Lisbon'
        })
      });
      const data = await res.json();
      setResult(data);
      console.log(data);
    } catch (err) {
      setResult({ error: String(err) });
    }
    setLoading(false);
  }

  async function testFetch() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setResult(data);
      console.log(data);
    } catch (err) {
      setResult({ error: String(err) });
    }
    setLoading(false);
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-2xl font-bold mb-4">Supabase Test</h1>
      <div className="flex gap-4 mb-6">
        <button 
          onClick={testSave} 
          disabled={loading}
          className="bg-zinc-900 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
        <button 
          onClick={testFetch} 
          disabled={loading}
          className="bg-zinc-200 text-zinc-900 px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Fetch Profile'}
        </button>
      </div>
      <pre className="bg-zinc-100 text-zinc-900 p-4 rounded text-sm min-h-[100px]">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}