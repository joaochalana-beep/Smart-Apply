"use client";

import { useInbox, InboxMessage } from "@/context/InboxContext";
import { useRouter } from "next/navigation";

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(date).toLocaleDateString();
}

function notificationIcon(type: InboxMessage["type"], from: InboxMessage["from"]) {
  if (type === "interview_invite") return "🟢";
  if (type === "offer") return "🎉";
  if (type === "rejection") return "🔴";
  if (type === "follow_up") return "🟡";
  if (from === "system") return "🔵";
  return "📬";
}

export function RecentNotifications() {
  const { messages, markAsRead } = useInbox();
  const router = useRouter();
  const recent = messages.slice(0, 5);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">🔔 Recent Notifications</h3>
        <button
          onClick={() => router.push("/inbox")}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          View all
        </button>
      </div>

      <div className="space-y-3">
        {recent.map((msg) => (
          <div
            key={msg.id}
            onClick={() => {
              markAsRead(msg.id);
              router.push("/inbox");
            }}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-zinc-800 ${
              msg.status === "unread"
                ? "border-zinc-700 bg-zinc-800/30"
                : "border-transparent"
            }`}
          >
            <span className="text-lg shrink-0">{notificationIcon(msg.type, msg.from)}</span>
            <div className="min-w-0">
              <p className={`text-sm truncate ${msg.status === "unread" ? "text-white font-medium" : "text-zinc-300"}`}>
                {msg.subject}
              </p>
              <p className="text-xs text-zinc-500 truncate">{msg.body.split("\n")[0]}</p>
              <p className="text-xs text-zinc-600 mt-1">{timeAgo(msg.sentAt)}</p>
            </div>
          </div>
        ))}

        {recent.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-6">No notifications yet</p>
        )}
      </div>
    </div>
  );
}
