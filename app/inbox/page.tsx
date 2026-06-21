"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Inbox,
  MailOpen,
  Trash2,
  CheckCheck,
  Search,
  ArrowLeft,
  Send,
  FileText,
  RotateCw,
  Briefcase,
} from "lucide-react";
import { useInbox, InboxMessage, MessageType } from "@/context/InboxContext";
import { formatDistanceToNow, format } from "date-fns";

type FilterTab = "all" | "unread" | "application_sent" | "company_reply" | "interview" | "offer" | "rejection";

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "application_sent", label: "Application Sent" },
  { key: "company_reply", label: "Company Replies" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offers" },
  { key: "rejection", label: "Rejections" },
];

const typeBadge: Record<string, string> = {
  application_sent: "bg-blue-500/20 text-blue-400",
  company_reply: "bg-zinc-500/20 text-zinc-400",
  confirmation: "bg-blue-500/20 text-blue-400",
  interview: "bg-emerald-500/20 text-emerald-400",
  rejection: "bg-red-500/20 text-red-400",
  offer: "bg-amber-500/20 text-amber-400",
  screening: "bg-purple-500/20 text-purple-400",
  general: "bg-zinc-500/20 text-zinc-400",
  response: "bg-zinc-500/20 text-zinc-400",
  interview_invite: "bg-emerald-500/20 text-emerald-400",
  follow_up: "bg-purple-500/20 text-purple-400",
};

const typeLabel: Record<string, string> = {
  application_sent: "Application Sent",
  company_reply: "Company Reply",
  confirmation: "Confirmation",
  interview: "Interview",
  rejection: "Rejection",
  offer: "Offer",
  screening: "Screening",
  general: "General",
  response: "Response",
  interview_invite: "Interview",
  follow_up: "Follow-up",
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
  const isApplicationSent = message.type === "application_sent";
  const title = isApplicationSent
    ? `Application sent to ${message.companyName}`
    : message.subject;
  const subtitle = `${message.jobTitle}${message.referenceNumber ? ` • ${message.referenceNumber}` : ""}`;
  const statusText = isApplicationSent
    ? "⏳ Awaiting response"
    : message.status === "unread"
    ? "🟢 New reply"
    : "✓ Read";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-zinc-800 transition-colors hover:bg-zinc-800/50 ${
        isSelected ? "bg-zinc-800" : ""
      } ${message.status === "unread" ? "bg-zinc-900/60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-lg flex-shrink-0">{isApplicationSent ? "📤" : "📧"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-white truncate">
              {isApplicationSent ? "ApplyWise" : message.fromName || message.companyName}
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
            {title}
          </p>
          <p className="text-xs text-zinc-500 truncate mt-1">{subtitle}</p>
          <p className="text-xs text-zinc-600 mt-1">{statusText}</p>
        </div>
      </div>
    </button>
  );
}

function ApplicationSentDetail({ message }: { message: InboxMessage }) {
  const lines = message.body.split("\n");
  const details: Record<string, string> = {};
  lines.forEach((line) => {
    const match = line.match(/^•\s*(.+?):\s*(.+)$/);
    if (match) details[match[1].trim()] = match[2].trim();
  });

  return (
    <div className="space-y-6">
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
        <h3 className="text-green-400 font-semibold text-lg mb-2">
          ✅ Your application has been sent to {message.companyName}!
        </h3>
        <p className="text-zinc-400 text-sm">
          The company can reply directly to this thread and you will see it here.
        </p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3">📋 Details</h4>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li>• Position: {details["Position"] || message.jobTitle}</li>
          <li>• Sent to: {details["Sent to"] || message.to}</li>
          <li>• Your email: {details["Your email"] || message.from}</li>
          {message.referenceNumber && <li>• Reference: {message.referenceNumber}</li>}
          {message.atsScore !== undefined && <li>• ATS Score: {message.atsScore}%</li>}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <RotateCw className="w-4 h-4" />
        <span>⏳ Waiting for company response...</span>
      </div>

      <div className="bg-zinc-800/50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">💡 Note</h4>
        <p className="text-zinc-500 text-sm">
          Company replies will arrive in your inbox here. You can track the application status from
          your dashboard.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href="/applications"
          className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Briefcase className="w-4 h-4" />
          View Application
        </a>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <RotateCw className="w-4 h-4" />
          Check Status
        </button>
      </div>
    </div>
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
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    // Sync the InboxContext filter with the local tab state
    if (activeTab === "all") {
      setFilter((f) => ({ ...f, type: "all", status: "all", category: "all" }));
    } else if (activeTab === "unread") {
      setFilter((f) => ({ ...f, type: "all", status: "unread", category: "all" }));
    } else if (activeTab === "application_sent") {
      setFilter((f) => ({ ...f, type: "application_sent", status: "all", category: "all" }));
    } else if (activeTab === "company_reply") {
      setFilter((f) => ({ ...f, type: "all", status: "all", category: "company_reply" }));
    } else {
      setFilter((f) => ({ ...f, type: activeTab as MessageType, status: "all", category: "all" }));
    }
  }, [activeTab, setFilter]);

  const selectedMessage = filteredMessages.find((m) => m.id === selectedId) || null;

  const displayedMessages = filteredMessages.filter((m) =>
    [m.subject, m.companyName, m.jobTitle, m.body, m.fromName].some((field) =>
      (field || "").toLowerCase().includes(search.toLowerCase())
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
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      activeTab === tab.key
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {tab.label}
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
                      {typeLabel[selectedMessage.type]}
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
                  {/* Email header */}
                  <div className="flex items-center justify-between mb-6 text-sm border-b border-zinc-800 pb-4">
                    <div className="space-y-1 text-zinc-400">
                      <p>
                        <span className="text-zinc-500">From:</span>{" "}
                        {selectedMessage.fromName || selectedMessage.from}{" "}
                        {selectedMessage.from.includes("@") && (
                          <span className="text-zinc-600">&lt;{selectedMessage.from}&gt;</span>
                        )}
                      </p>
                      <p>
                        <span className="text-zinc-500">To:</span>{" "}
                        {selectedMessage.toName || selectedMessage.to}
                      </p>
                      <p>
                        <span className="text-zinc-500">Subject:</span> {selectedMessage.subject}
                      </p>
                      {selectedMessage.referenceNumber && (
                        <p>
                          <span className="text-zinc-500">Reference:</span>{" "}
                          {selectedMessage.referenceNumber}
                        </p>
                      )}
                    </div>
                    <span className="text-zinc-500 flex-shrink-0">
                      {format(new Date(selectedMessage.sentAt), "PPP p")}
                    </span>
                  </div>

                  {selectedMessage.type === "application_sent" ? (
                    <ApplicationSentDetail message={selectedMessage} />
                  ) : (
                    <div className="prose prose-invert max-w-none whitespace-pre-line text-zinc-300 leading-relaxed">
                      {selectedMessage.body}
                    </div>
                  )}
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
