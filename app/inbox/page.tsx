"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Inbox, MailOpen, Trash2, CheckCheck, Search, Filter, ArrowLeft } from "lucide-react";
import { useInbox, InboxMessage, MessageType } from "@/context/InboxContext";
import { formatDistanceToNow, format } from "date-fns";

const typeLabels: Record<MessageType | "all", string> = {
  all: "All",
  confirmation: "Confirmation",
  response: "Response",
  interview_invite: "Interview",
  rejection: "Rejection",
  offer: "Offer",
  follow_up: "Follow-up",
};

const typeBadge: Record<MessageType, string> = {
  confirmation: "bg-blue-500/20 text-blue-400",
  response: "bg-zinc-500/20 text-zinc-400",
  interview_invite: "bg-emerald-500/20 text-emerald-400",
  rejection: "bg-red-500/20 text-red-400",
  offer: "bg-amber-500/20 text-amber-400",
  follow_up: "bg-purple-500/20 text-purple-400",
};

function MessageRow({
  message,
  isSelected,
  onClick,
}: {
  message: InboxMessage;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-zinc-800 transition-colors hover:bg-zinc-800/50 ${
        isSelected ? "bg-zinc-800" : ""
      } ${message.status === "unread" ? "bg-zinc-900/60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
            message.status === "unread" ? "bg-indigo-400" : "bg-zinc-700"
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-white truncate">
              {message.companyName}
            </span>
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
            </span>
          </div>
          <p
            className={`text-sm truncate ${
              message.status === "unread" ? "text-white font-medium" : "text-zinc-400"
            }`}
          >
            {message.subject}
          </p>
          <p className="text-xs text-zinc-500 truncate mt-1">{message.jobTitle}</p>
        </div>
      </div>
    </button>
  );
}

export default function InboxPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const {
    filteredMessages,
    filter,
    setFilter,
    markAsRead,
    markAsUnread,
    deleteMessage,
    markAllAsRead,
    unreadCount,
  } = useInbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const selectedMessage = filteredMessages.find((m) => m.id === selectedId) || null;

  const displayedMessages = filteredMessages.filter((m) =>
    [m.subject, m.companyName, m.jobTitle, m.body].some((field) =>
      field.toLowerCase().includes(search.toLowerCase())
    )
  );

  function handleSelect(message: InboxMessage) {
    setSelectedId(message.id);
    if (message.status === "unread") {
      markAsRead(message.id);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-zinc-400">Loading inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-24 pb-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-400" />
            Inbox
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500 text-xs font-semibold">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Sidebar / list */}
          <div
            className={`flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden ${
              selectedMessage ? "hidden lg:flex lg:w-1/3" : "flex w-full"
            }`}
          >
            {/* Filters */}
            <div className="p-4 border-b border-zinc-800 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "unread", "read"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter((f) => ({ ...f, status }))}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filter.status === status
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {status === "all" ? "All" : status === "unread" ? "Unread" : "Read"}
                  </button>
                ))}
                <div className="w-px h-5 bg-zinc-800 mx-1" />
                {(["all", "today", "week"] as const).map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setFilter((f) => ({ ...f, timeframe }))}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filter.timeframe === timeframe
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {timeframe === "all" ? "All time" : timeframe === "today" ? "Today" : "This week"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(typeLabels) as (MessageType | "all")[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter((f) => ({ ...f, type }))}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      filter.type === type
                        ? "bg-zinc-800 border-zinc-500 text-white"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto">
              {displayedMessages.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <MailOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No messages found.</p>
                </div>
              ) : (
                displayedMessages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    isSelected={selectedId === message.id}
                    onClick={() => handleSelect(message)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail view */}
          <div
            className={`flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden ${
              selectedMessage ? "flex w-full lg:w-2/3" : "hidden lg:flex lg:w-2/3"
            }`}
          >
            {selectedMessage ? (
              <>
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold truncate">{selectedMessage.subject}</h2>
                    <p className="text-sm text-zinc-400">
                      {selectedMessage.companyName} · {selectedMessage.jobTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        typeBadge[selectedMessage.type]
                      }`}
                    >
                      {typeLabels[selectedMessage.type]}
                    </span>
                    <button
                      onClick={() =>
                        selectedMessage.status === "read"
                          ? markAsUnread(selectedMessage.id)
                          : markAsRead(selectedMessage.id)
                      }
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      title={selectedMessage.status === "read" ? "Mark unread" : "Mark read"}
                    >
                      <MailOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        deleteMessage(selectedMessage.id);
                        setSelectedId(null);
                      }}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="flex items-center justify-between mb-6 text-sm text-zinc-500">
                    <span>From: {selectedMessage.from === "company" ? selectedMessage.companyName : "ApplyFlow"}</span>
                    <span>{format(new Date(selectedMessage.sentAt), "PPP p")}</span>
                  </div>
                  <div className="prose prose-invert max-w-none whitespace-pre-line text-zinc-300 leading-relaxed">
                    {selectedMessage.body}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
                <Inbox className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a message to read</p>
                <p className="text-sm">Your inbox has {unreadCount} unread messages.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
