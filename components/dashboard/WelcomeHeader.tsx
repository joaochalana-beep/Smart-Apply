"use client";

import { useUser } from "@clerk/nextjs";

export function WelcomeHeader() {
  const { user, isLoaded } = useUser();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const name = isLoaded ? user?.firstName || user?.username || "there" : "there";

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
        👋 Welcome back, {name}!
      </h1>
      <p className="text-zinc-400 text-sm">{today}</p>
    </div>
  );
}
