"use client";

import { ReactNode } from "react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pt-24 md:p-10 md:pt-28">
      <div className="max-w-7xl mx-auto space-y-6">
        {children}
      </div>
    </div>
  );
}
