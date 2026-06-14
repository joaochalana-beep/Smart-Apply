"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function NavLinks() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <>
        <Link href="/discover" className="text-zinc-400 hover:text-white transition-colors">Discover</Link>
        <Link href="/target-job" className="text-zinc-400 hover:text-white transition-colors">Target Job</Link>
        <Link href="/applications" className="text-zinc-400 hover:text-white transition-colors">Applications</Link>
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