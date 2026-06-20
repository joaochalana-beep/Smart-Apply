"use client";

import { useRouter } from "next/navigation";

interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  match_score: number;
}

interface RecommendedJobsProps {
  jobs?: RecommendedJob[];
  profileSummary?: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export function RecommendedJobs({
  jobs = [],
  profileSummary = "entry-level, remote, Trust & Safety / KYC / Compliance roles",
}: RecommendedJobsProps) {
  const router = useRouter();

  const defaultJobs: RecommendedJob[] = [
    { id: "r1", title: "KYC Analyst", company: "Fenergo", location: "Dublin, Ireland", match_score: 94 },
    { id: "r2", title: "Customer Support Specialist", company: "Intercom", location: "Remote - Ireland", match_score: 91 },
    { id: "r3", title: "AML Analyst", company: "Bank of Ireland", location: "Dublin, Ireland", match_score: 89 },
  ];

  const display = jobs.length > 0 ? jobs.slice(0, 3) : defaultJobs;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-slide-up">
      <h3 className="text-lg font-semibold text-white mb-2">📍 Recommended For You</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Based on your profile: {profileSummary}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {display.map((job) => (
          <div
            key={job.id}
            onClick={() => router.push("/discover")}
            className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`${getScoreColor(job.match_score)} text-black text-xs font-bold px-2 py-0.5 rounded-full`}>
                {job.match_score}%
              </span>
            </div>
            <p className="text-white font-medium text-sm mb-1">{job.title}</p>
            <p className="text-zinc-400 text-xs">{job.company}</p>
            <p className="text-zinc-500 text-xs">{job.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
