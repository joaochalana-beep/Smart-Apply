"use client";

import { useRouter } from "next/navigation";
import { RefreshCw, MapPin, Briefcase } from "lucide-react";

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
  onRefresh?: () => void;
  loading?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreBadge(score: number) {
  if (score >= 80) return "🟢";
  if (score >= 50) return "🟡";
  return "🔴";
}

export function RecommendedJobs({
  jobs = [],
  profileSummary = "entry-level, remote, Trust & Safety / KYC / Compliance roles",
  onRefresh,
  loading = false,
}: RecommendedJobsProps) {
  const router = useRouter();

  const display = jobs
    .filter((j) => j.match_score >= 70 && j.title !== "Unknown Role" && j.company !== "Unknown")
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 6);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">🎯 Recommended For You</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-500 mb-4">
        Based on your profile: {profileSummary}
      </p>

      {display.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-8 text-center">
          <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-4">No strong matches yet. Update your profile!</p>
          <button
            onClick={() => router.push("/profile")}
            className="bg-white text-zinc-900 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition"
          >
            Go to Profile →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {display.map((job) => (
            <div
              key={job.id}
              className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`${getScoreColor(job.match_score)} text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                  {getScoreBadge(job.match_score)} {job.match_score}% Match
                </span>
              </div>
              <p className="text-white font-medium text-sm mb-1 line-clamp-1">{job.title}</p>
              <p className="text-zinc-400 text-xs mb-2">{job.company}</p>
              <p className="text-zinc-500 text-xs flex items-center gap-1 mb-4">
                <MapPin className="w-3 h-3" />
                {job.location}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/discover`)}
                  className="flex-1 bg-white text-zinc-900 text-xs font-medium px-3 py-2 rounded-full hover:bg-zinc-200 transition"
                >
                  🚀 Prepare & Apply
                </button>
                <button
                  onClick={() => router.push(`/discover`)}
                  className="bg-zinc-700 text-white text-xs font-medium px-3 py-2 rounded-full hover:bg-zinc-600 transition"
                >
                  👁 View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
