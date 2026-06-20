"use client";

import Link from "next/link";

interface StatCardsProps {
  profileCompletion?: number;
  newJobs?: number;
  nextTargetDue?: string;
  pendingApplications?: number;
}

const cards = [
  {
    id: "profile",
    label: "Profile Completion",
    value: (p: StatCardsProps) => `${p.profileCompletion ?? 75}%`,
    sub: (p: StatCardsProps) => ((p.profileCompletion ?? 75) >= 90 ? "Looking great" : "Keep improving"),
    icon: "📊",
    href: "/profile",
  },
  {
    id: "discover",
    label: "New Jobs",
    value: (p: StatCardsProps) => `${p.newJobs ?? 24}`,
    sub: () => "Matches found",
    icon: "🔍",
    href: "/discover",
  },
  {
    id: "target",
    label: "Next Target Job",
    value: (p: StatCardsProps) => p.nextTargetDue ?? "Due in 2d",
    sub: () => "Stay on track",
    icon: "🎯",
    href: "/target-job",
  },
  {
    id: "applications",
    label: "Pending Applications",
    value: (p: StatCardsProps) => `${p.pendingApplications ?? 8}`,
    sub: () => "Awaiting response",
    icon: "📋",
    href: "/applications",
  },
];

export function StatCards(props: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
      {cards.map((card, i) => (
        <Link
          key={card.id}
          href={card.href}
          className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-300"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{card.icon}</span>
            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
              View →
            </span>
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-white mb-1">{card.value(props)}</p>
          <p className="text-xs text-zinc-500">{card.sub(props)}</p>
        </Link>
      ))}
    </div>
  );
}
