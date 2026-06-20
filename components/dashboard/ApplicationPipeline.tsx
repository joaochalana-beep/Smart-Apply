"use client";

interface ApplicationPipelineProps {
  applications?: any[];
}

const stages = [
  { id: "applied", label: "Applied", statuses: ["sent", "viewed"], color: "bg-blue-500" },
  { id: "screening", label: "Screening", statuses: ["prepared"], color: "bg-amber-500" },
  { id: "interview", label: "Interview", statuses: ["interview"], color: "bg-green-500" },
  { id: "offer", label: "Offer", statuses: ["offer"], color: "bg-purple-500" },
];

export function ApplicationPipeline({ applications = [] }: ApplicationPipelineProps) {
  const counts = stages.map((stage) => ({
    ...stage,
    count: applications.filter((a) => stage.statuses.includes(a.status)).length,
  }));

  // Fallback demo counts when no real data
  const displayCounts = applications.length > 0
    ? counts
    : stages.map((s, i) => ({ ...s, count: [12, 5, 3, 1][i] }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-slide-up">
      <h3 className="text-lg font-semibold text-white mb-4">📅 Application Pipeline</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayCounts.map((stage) => (
          <div
            key={stage.id}
            className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4 text-center hover:border-zinc-600 transition-all"
          >
            <div className={`w-3 h-3 rounded-full ${stage.color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-white">{stage.count}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{stage.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
