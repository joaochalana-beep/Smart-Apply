"use client";

import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";

export function AuthNav() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse" />;
  }

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <SignInButton mode="modal">
      <button className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
        Sign In
      </button>
    </SignInButton>
  );
}