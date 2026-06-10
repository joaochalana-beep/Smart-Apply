"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      if (res.ok) {
        fetchApplications(); // Refresh
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchApplications(); // Refresh
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  const statusColors: Record<string, string> = {
    sent: "bg-blue-900/50 text-blue-400",
    viewed: "bg-yellow-900/50 text-yellow-400",
    interview: "bg-green-900/50 text-green-400",
    rejected: "bg-red-900/50 text-red-400",
    ghosted: "bg-zinc-800 text-zinc-400",
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Application Tracker</h1>
          <button
            onClick={() => router.push("/target-job")}
            className="bg-white text-zinc-900 px-5 py-2 rounded-full font-medium hover:bg-zinc-200 transition"
          >
            + New Application
          </button>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg mb-4">No applications yet</p>
            <button
              onClick={() => router.push("/target-job")}
              className="bg-zinc-800 text-white px-6 py-3 rounded-full hover:bg-zinc-700 transition"
            >
              Target Your First Job
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app: any) => (
              <div
                key={app.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">
  {app.role || "Unknown Role"}
</h3>
<p className="text-zinc-400 text-sm">
  {app.company || "Unknown Company"} • {new Date(app.sent_at).toLocaleDateString()}
</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[app.status] || "bg-zinc-800 text-zinc-400"}`}>
                      {app.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                    {app.method === "auto" ? "🤖 Auto" : "✋ Manual"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                    <option value="ghosted">Ghosted</option>
                  </select>

                  <button
                    onClick={() => router.push(`/applications/${app.id}`)}
                    className="text-sm bg-zinc-800 text-white px-3 py-2 rounded-lg hover:bg-zinc-700 transition"
                  >
                    View Details
                  </button>

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
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{applications.length}</div>
              <div className="text-xs text-zinc-400">Total</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {applications.filter((a) => a.status === "interview").length}
              </div>
              <div className="text-xs text-zinc-400">Interviews</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {applications.filter((a) => a.status === "sent").length}
              </div>
              <div className="text-xs text-zinc-400">Pending</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {applications.filter((a) => a.status === "rejected").length}
              </div>
              <div className="text-xs text-zinc-400">Rejected</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}