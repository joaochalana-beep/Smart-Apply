"use client";

import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";

export function AuthNav() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="w-8 h-8 rounded-full bg-zinc-700 animate-pulse" />;
  }

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <SignInButton mode="modal">
      <button className="bg-white text-zinc-900 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors">
        Sign In
      </button>
    </SignInButton>
  );
}