"use client";

import { useRouter } from "next/navigation";

interface RecentActivityProps {
  applications?: any[];
}

export function RecentActivity({ applications = [] }: RecentActivityProps) {
  const router = useRouter();
  const recent = [...applications]
    .sort((a, b) => new Date(b.sent_at || b.appliedAt || 0).getTime() - new Date(a.sent_at || a.appliedAt || 0).getTime())
    .slice(0, 5);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-slide-up">
      <h3 className="text-lg font-semibold text-white mb-4">📅 Recent Activity</h3>

      {recent.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-6">No recent activity yet</p>
      ) : (
        <div className="space-y-3">
          {recent.map((app, i) => (
            <div
              key={app.id || i}
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{app.role || app.jobTitle || "Application"}</p>
                <p className="text-xs text-zinc-500 truncate">{app.company || app.companyName || "Unknown Company"}</p>
              </div>
              <span className="text-xs text-zinc-400 whitespace-nowrap ml-3">
                {new Date(app.sent_at || app.appliedAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => router.push("/applications")}
        className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        View all applications →
      </button>
    </div>
  );
}
