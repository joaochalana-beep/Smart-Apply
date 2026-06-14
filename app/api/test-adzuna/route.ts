import { NextResponse } from "next/server";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

export async function GET() {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return NextResponse.json({ 
      error: "Adzuna credentials not configured",
      appId: ADZUNA_APP_ID ? "set" : "missing",
      appKey: ADZUNA_APP_KEY ? "set" : "missing",
    }, { status: 500 });
  }

  const tests = [];
  const countries = ["gb", "de", "fr", "es", "pt"];
  
  for (const country of countries) {
    try {
      const params = new URLSearchParams({
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        results_per_page: "5",
        what: "software engineer remote",
      });
      
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      const text = await res.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      
      tests.push({
        country,
        status: res.status,
        ok: res.ok,
        jobsFound: data?.results?.length || 0,
        error: res.ok ? null : (data?.description || text.slice(0, 200)),
      });
    } catch (err: any) {
      tests.push({
        country,
        status: "error",
        ok: false,
        jobsFound: 0,
        error: err.message,
      });
    }
  }

  return NextResponse.json({
    credentials: "configured",
    tests,
    summary: {
      workingCountries: tests.filter(t => t.ok && t.jobsFound > 0).map(t => t.country),
      totalJobs: tests.reduce((sum, t) => sum + t.jobsFound, 0),
    }
  });
}