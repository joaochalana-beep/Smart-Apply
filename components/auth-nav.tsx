"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AuthNav() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  return (
    <>
      {isSignedIn ? (
        <div className="flex items-center gap-6">
          <Link
            href="/target-job"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Target Job
          </Link>
          <Link
            href="/applications"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Applications
          </Link>
          <Link
            href="/profile"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Profile
          </Link>
          <UserButton />
        </div>
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