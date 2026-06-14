"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type FilterTab = "all" | "prepared" | "applied" | "interview" | "rejected";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const router = useRouter();

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      setApplications(data || []);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchApplications();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) fetchApplications();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  const statusColors: Record<string, string> = {
    prepared: "bg-amber-900/50 text-amber-400",
    sent: "bg-blue-900/50 text-blue-400",
    viewed: "bg-yellow-900/50 text-yellow-400",
    interview: "bg-green-900/50 text-green-400",
    rejected: "bg-red-900/50 text-red-400",
    ghosted: "bg-zinc-800 text-zinc-400",
  };

  const statusLabels: Record<string, string> = {
    prepared: "To Apply",
    sent: "Applied",
    viewed: "Viewed",
    interview: "Interview",
    rejected: "Rejected",
    ghosted: "Ghosted",
  };

  const filteredApps = applications.filter((app) => {
    if (activeTab === "all") return true;
    if (activeTab === "prepared") return app.status === "prepared";
    if (activeTab === "applied") return ["sent", "viewed"].includes(app.status);
    return app.status === activeTab;
  });

  const tabCounts = {
    all: applications.length,
    prepared: applications.filter((a) => a.status === "prepared").length,
    applied: applications.filter((a) => ["sent", "viewed"].includes(a.status)).length,
    interview: applications.filter((a) => a.status === "interview").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white p-10 pt-24">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10 pt-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Application Tracker</h1>
          <button
            onClick={() => router.push("/discover")}
            className="bg-white text-zinc-900 px-5 py-2 rounded-full font-medium hover:bg-zinc-200 transition"
          >
            + Find Jobs
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["all", "prepared", "applied", "interview", "rejected"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tabCounts[tab]})
            </button>
          ))}
        </div>

        {filteredApps.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg mb-4">
              {activeTab === "all" ? "No applications yet" : `No ${activeTab} applications`}
            </p>
            <button
              onClick={() => router.push("/discover")}
              className="bg-zinc-800 text-white px-6 py-3 rounded-full hover:bg-zinc-700 transition"
            >
              Discover Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app: any) => (
              <div
                key={app.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold mb-1 truncate">
                      {app.role || "Unknown Role"}
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      {app.company || "Unknown Company"} • {new Date(app.sent_at).toLocaleDateString()}
                    </p>
                    {app.status === "prepared" && (
                      <p className="text-amber-400 text-xs mt-1">Ready to apply — click "Mark Applied" after submitting</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[app.status] || "bg-zinc-800 text-zinc-400"}`}>
                      {statusLabels[app.status] || app.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                    {app.apply_method === "auto" || app.method === "auto" ? "🤖 Auto" : "✋ Manual"}
                  </span>
                  {app.resume_text && (
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                      📄 Resume ready
                    </span>
                  )}
                  {app.cover_letter && (
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                      📝 Cover letter ready
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {app.status === "prepared" ? (
                    <button
                      onClick={() => updateStatus(app.id, "sent")}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500 transition"
                    >
                      ✓ Mark as Applied
                    </button>
                  ) : (
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="sent">Applied</option>
                      <option value="viewed">Viewed</option>
                      <option value="interview">Interview</option>
                      <option value="rejected">Rejected</option>
                      <option value="ghosted">Ghosted</option>
                    </select>
                  )}

                  {app.resume_text && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(app.resume_text);
                        alert("Resume copied to clipboard!");
                      }}
                      className="text-sm bg-zinc-800 text-white px-3 py-2 rounded-lg hover:bg-zinc-700 transition"
                    >
                      Copy Resume
                    </button>
                  )}

                  {app.cover_letter && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(app.cover_letter);
                        alert("Cover letter copied to clipboard!");
                      }}
                      className="text-sm bg-zinc-800 text-white px-3 py-2 rounded-lg hover:bg-zinc-700 transition"
                    >
                      Copy Cover Letter
                    </button>
                  )}

                  <button
                    onClick={() => deleteApplication(app.id)}
                    className="text-sm text-red-400 hover:text-red-300 transition ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {applications.length > 0 && (
          <div className="grid grid-cols-5 gap-4 mt-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{applications.length}</div>
              <div className="text-xs text-zinc-400">Total</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{tabCounts.prepared}</div>
              <div className="text-xs text-zinc-400">To Apply</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{tabCounts.interview}</div>
              <div className="text-xs text-zinc-400">Interviews</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{tabCounts.applied}</div>
              <div className="text-xs text-zinc-400">Applied</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{tabCounts.rejected}</div>
              <div className="text-xs text-zinc-400">Rejected</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}