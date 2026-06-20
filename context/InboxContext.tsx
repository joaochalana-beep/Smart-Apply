"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type MessageType =
  | "confirmation"
  | "response"
  | "interview_invite"
  | "rejection"
  | "offer"
  | "follow_up";

export type MessageStatus = "read" | "unread";

export interface InboxMessage {
  id: string;
  applicationId: string;
  jobTitle: string;
  companyName: string;
  subject: string;
  body: string;
  type: MessageType;
  status: MessageStatus;
  sentAt: string;
  from: "system" | "company";
}

interface InboxContextValue {
  messages: InboxMessage[];
  unreadCount: number;
  addMessage: (message: Omit<InboxMessage, "id" | "sentAt">) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  toggleRead: (id: string) => void;
  deleteMessage: (id: string) => void;
  markAllAsRead: () => void;
  filter: {
    type: MessageType | "all";
    status: "all" | "read" | "unread";
    timeframe: "all" | "today" | "week";
  };
  setFilter: React.Dispatch<
    React.SetStateAction<{
      type: MessageType | "all";
      status: "all" | "read" | "unread";
      timeframe: "all" | "today" | "week";
    }>
  >;
  filteredMessages: InboxMessage[];
  loading: boolean;
}

function mapApiMessage(row: any): InboxMessage {
  return {
    id: row.id,
    applicationId: row.application_id || "",
    jobTitle: row.job_title || "Unknown Role",
    companyName: row.company_name || "Unknown Company",
    subject: row.subject || "",
    body: row.body || "",
    type: row.type as MessageType,
    status: row.status as MessageStatus,
    sentAt: row.sent_at,
    from: row.from as "system" | "company",
  };
}

const InboxContext = createContext<InboxContextValue | undefined>(undefined);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type: MessageType | "all";
    status: "all" | "read" | "unread";
    timeframe: "all" | "today" | "week";
  }>({
    type: "all",
    status: "all",
    timeframe: "all",
  });

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages((data || []).map(mapApiMessage));
      return (data || []).length as number;
    } catch (err) {
      console.error("[Inbox] fetchMessages error:", err);
      return messages.length;
    }
  }, [messages.length]);

  const seedMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/seed", { method: "POST" });
      if (!res.ok) throw new Error("Failed to seed messages");
      const data = await res.json();
      return data.seeded as number;
    } catch (err) {
      console.error("[Inbox] seedMessages error:", err);
      return 0;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const count = await fetchMessages();
      if (!cancelled && count === 0) {
        const seeded = await seedMessages();
        if (seeded > 0) {
          await fetchMessages();
        }
      }
      setHydrated(true);
      setLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [fetchMessages, seedMessages]);

  const addMessage = useCallback(async (message: Omit<InboxMessage, "id" | "sentAt">) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: InboxMessage = {
      ...message,
      id: tempId,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [optimistic, ...prev]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: message.applicationId,
          job_title: message.jobTitle,
          company_name: message.companyName,
          subject: message.subject,
          body: message.body,
          type: message.type,
          status: message.status,
          from: message.from,
          sent_at: optimistic.sentAt,
        }),
      });
      if (!res.ok) throw new Error("Failed to add message");
      const saved = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? mapApiMessage(saved) : m)));
    } catch (err) {
      console.error("[Inbox] addMessage error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: MessageStatus) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );

    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update message");
    } catch (err) {
      console.error("[Inbox] updateStatus error:", err);
    }
  }, []);

  const markAsRead = useCallback((id: string) => updateStatus(id, "read"), [updateStatus]);
  const markAsUnread = useCallback((id: string) => updateStatus(id, "unread"), [updateStatus]);

  const toggleRead = useCallback(
    (id: string) => {
      const message = messages.find((m) => m.id === id);
      if (!message) return;
      updateStatus(id, message.status === "read" ? "unread" : "read");
    },
    [messages, updateStatus]
  );

  const deleteMessage = useCallback(async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete message");
    } catch (err) {
      console.error("[Inbox] deleteMessage error:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setMessages((prev) => prev.map((m) => ({ ...m, status: "read" as const })));
    const unreadIds = messages.filter((m) => m.status === "unread").map((m) => m.id);
    await Promise.all(
      unreadIds.map((id) =>
        fetch(`/api/messages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "read" }),
        })
      )
    );
  }, [messages]);

  const filteredMessages = messages.filter((m) => {
    if (filter.type !== "all" && m.type !== filter.type) return false;
    if (filter.status !== "all" && m.status !== filter.status) return false;
    if (filter.timeframe !== "all") {
      const sent = new Date(m.sentAt).getTime();
      const now = Date.now();
      if (filter.timeframe === "today") {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        if (sent < startOfToday) return false;
      } else if (filter.timeframe === "week") {
        if (sent < now - 7 * 24 * 60 * 60 * 1000) return false;
      }
    }
    return true;
  });

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <InboxContext.Provider
      value={{
        messages,
        unreadCount,
        addMessage,
        markAsRead,
        markAsUnread,
        toggleRead,
        deleteMessage,
        markAllAsRead,
        filter,
        setFilter,
        filteredMessages,
        loading,
      }}
    >
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox must be used within an InboxProvider");
  }
  return context;
}
