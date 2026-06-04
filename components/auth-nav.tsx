"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AuthNav() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  return (
    <>
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <Link 
          href="/sign-in"
          className="bg-zinc-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Sign In
        </Link>
      )}
    </>
  );
}