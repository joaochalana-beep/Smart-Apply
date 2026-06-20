"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useInbox } from "@/context/InboxContext";

export function NavLinks() {
  const { isSignedIn } = useAuth();
  const { unreadCount } = useInbox();

  if (isSignedIn) {
    return (
      <>
        <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
        <Link href="/discover" className="text-zinc-400 hover:text-white transition-colors">Discover</Link>
        <Link href="/target-job" className="text-zinc-400 hover:text-white transition-colors">Target Job</Link>
        <Link href="/applications" className="text-zinc-400 hover:text-white transition-colors">Applications</Link>
        <Link href="/inbox" className="relative text-zinc-400 hover:text-white transition-colors">
          Inbox
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-3 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <Link href="/profile" className="text-zinc-400 hover:text-white transition-colors">Profile</Link>
      </>
    );
  }

  return (
    <>
      <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
      <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</a>
      <a href="#faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</a>
    </>
  );
}