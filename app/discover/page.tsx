"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
  url: string;
  work_type: string;
  job_type: string;
  experience_level: string;
  match_score: number;
  date_posted: string;
}

export default function DiscoverPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const router = useRouter();
  const { getToken } = useAuth();

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    setError("");
    setProfileError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/discover", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needsProfileUpdate) {
          setProfileError(data.message || "Please complete your profile to discover jobs.");
          setJobs([]);
          setLoading(false);
          return;
        }
        throw new Error(data.error || data.message || "Failed to load jobs");
      }

      // Map API response to frontend Job interface
      const mappedJobs = (data.jobs || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        salary: job.salary,
        url: job.url,
        work_type: job.remote ? "Remote" : "On-site",
        job_type: "Full-time",
        experience_level: "",
        match_score: job.match_score || 0,
        date_posted: job.created_at,
      }));

      setJobs(mappedJobs);
    } catch (err: any) {
      setError(err.message || "Failed to load jobs");
    }
    setLoading(false);
  }

  async function prepareApplication(job: Job) {
    setGeneratingFor(job.id);
    try {
      const token = await getToken();
      const res = await fetch("/api/generate-tailored-docs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobUrl: job.url,
          jobDescription: job.description,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const appRes = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: job.id,
          company: job.company,
          role: job.title,
          job_url: job.url,
          resume_text: data.resume,
          cover_letter: data.coverLetter,
          method: "one_click",
          status: "prepared",
        }),
      });

      if (!appRes.ok) {
        const appData = await appRes.json();
        throw new Error(appData.error || "Failed to save application");
      }

      window.open(job.url, "_blank");
    } catch (err: any) {
      alert("Failed to prepare application: " + err.message);
    }
    setGeneratingFor(null);
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-zinc-500";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-10 pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">Scanning for jobs that match your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10 pt-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Discover Jobs</h1>
            <p className="text-zinc-400">
              {jobs.length > 0
                ? `Found ${jobs.length} jobs matching your profile`
                : "Find jobs that match your skills and preferences"}
            </p>
          </div>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="bg-zinc-800 text-white px-4 py-2 rounded-full hover:bg-zinc-700 transition text-sm"
          >
            Refresh
          </button>
        </div>

        {profileError && (
          <div className="bg-amber-900/50 border border-amber-800 rounded-lg p-6 text-amber-400 mb-6">
            <p className="font-medium mb-3">{profileError}</p>
            <button
              onClick={() => router.push("/profile")}
              className="bg-amber-700 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-amber-600 transition"
            >
              Complete Your Profile →
            </button>
          </div>
        )}

        {error && !profileError && (
          <div className="bg-red-900/50 border border-red-800 rounded-lg p-4 text-red-400 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold">{job.title}</h3>
                    <span className={`${getScoreColor(job.match_score)} text-black text-xs font-bold px-2 py-1 rounded-full`}>
                      {job.match_score}% Match
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm mb-2">
                    {job.company} • {job.location}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {job.salary && job.salary !== "Not specified" && (
                      <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded">
                        {job.salary}
                      </span>
                    )}
                    {job.work_type && (
                      <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded capitalize">
                        {job.work_type}
                      </span>
                    )}
                    {job.job_type && (
                      <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded capitalize">
                        {job.job_type}
                      </span>
                    )}
                    {job.experience_level && (
                      <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded capitalize">
                        {job.experience_level}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-3">
                {job.description.replace(/<[^>]*>/g, "").slice(0, 300)}...
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => prepareApplication(job)}
                  disabled={generatingFor === job.id}
                  className="bg-white text-zinc-900 px-5 py-2 rounded-full font-medium text-sm hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {generatingFor === job.id ? "Preparing..." : "Prepare & Apply"}
                </button>
                <button
                  onClick={() => window.open(job.url, "_blank")}
                  className="bg-zinc-800 text-white px-5 py-2 rounded-full font-medium text-sm hover:bg-zinc-700 transition"
                >
                  View Job
                </button>
                <button
                  onClick={() => router.push("/target-job")}
                  className="bg-zinc-800 text-white px-5 py-2 rounded-full font-medium text-sm hover:bg-zinc-700 transition"
                >
                  Custom Apply
                </button>
              </div>
            </div>
          ))}
        </div>

        {jobs.length === 0 && !error && !profileError && (
          <div className="text-center py-20">
            <p className="text-zinc-500 mb-4">No jobs found matching your preferences.</p>
            <button
              onClick={() => router.push("/profile")}
              className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition"
            >
              Update Preferences →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}