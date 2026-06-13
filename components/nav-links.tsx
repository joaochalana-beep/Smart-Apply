"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function NavLinks() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <>
        <Link href="/discover" className="hover:text-zinc-900 transition-colors">Discover</Link>
        <Link href="/target-job" className="hover:text-zinc-900 transition-colors">Target Job</Link>
        <Link href="/applications" className="hover:text-zinc-900 transition-colors">Applications</Link>
        <Link href="/profile" className="hover:text-zinc-900 transition-colors">Profile</Link>
      </>
    );
  }

  return (
    <>
      <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
      <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
      <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
    </>
  );
}