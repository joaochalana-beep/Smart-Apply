"use client";

import { useRouter } from "next/navigation";

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  match_score: number;
}

interface JobMatchesPreviewProps {
  matches?: JobMatch[];
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export function JobMatchesPreview({ matches = [] }: JobMatchesPreviewProps) {
  const router = useRouter();

  const defaultMatches: JobMatch[] = [
    { id: "1", title: "KYC Specialist", company: "Revolut", location: "Remote - Ireland", match_score: 92 },
    { id: "2", title: "Compliance Officer", company: "N26", location: "Remote - Ireland", match_score: 88 },
    { id: "3", title: "Risk Analyst", company: "Stripe", location: "Dublin, Ireland", match_score: 85 },
    { id: "4", title: "Trust & Safety Analyst", company: "Meta", location: "Remote - Ireland", match_score: 83 },
    { id: "5", title: "Implementation Specialist", company: "LearnUpon", location: "Remote - Ireland", match_score: 81 },
  ];

  const display = matches.length > 0 ? matches.slice(0, 5) : defaultMatches;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full animate-slide-up">
      <h3 className="text-lg font-semibold text-white mb-4">🎯 Job Matches Preview</h3>

      <div className="space-y-3">
        {display.map((job) => (
          <div
            key={job.id}
            onClick={() => router.push("/discover")}
            className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{job.title}</p>
              <p className="text-xs text-zinc-500 truncate">{job.company} • {job.location}</p>
            </div>
            <span className={`text-sm font-bold whitespace-nowrap ml-3 ${getScoreColor(job.match_score)}`}>
              {job.match_score}% match
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/discover")}
        className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        View All Matches →
      </button>
    </div>
  );
}
