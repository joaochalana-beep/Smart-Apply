"use client";

import { useRouter } from "next/navigation";

const actions = [
  { id: "new-app", label: "+ New Application", href: "/target-job" },
  { id: "search", label: "🔍 Search Jobs", href: "/discover" },
  { id: "profile", label: "📝 Edit Profile", href: "/profile" },
  { id: "reports", label: "📊 View Reports", href: "/applications" },
  { id: "settings", label: "⚙️ Settings", href: "/profile" },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full animate-slide-up">
      <h3 className="text-lg font-semibold text-white mb-4">⚡ Quick Actions</h3>

      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => router.push(action.href)}
            className="w-full text-left px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-800 text-sm text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-all"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
