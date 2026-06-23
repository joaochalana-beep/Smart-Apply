"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";
import { PLANS } from "@/lib/subscription";

interface UpgradeBannerProps {
  className?: string;
}

export function UpgradeBanner({ className = "" }: UpgradeBannerProps) {
  const { tier, applicationsRemaining } = useSubscription();

  if (tier === "elite") return null;

  const plan = PLANS[tier];
  const remaining = applicationsRemaining === Infinity ? "Unlimited" : applicationsRemaining;

  return (
    <div
      className={`bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-white font-medium">
            You&apos;re on the {plan.name} plan — {remaining} application{remaining === 1 ? "" : "s"} remaining this month
          </p>
          <p className="text-zinc-400 text-sm">
            {tier === "free"
              ? "Upgrade to Starter for 30 applications/month and auto-apply."
              : `Upgrade to unlock more applications and premium features.`}
          </p>
        </div>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 px-5 py-2 rounded-full text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 transition"
      >
        Upgrade
      </Link>
    </div>
  );
}

interface UsageWarningProps {
  usage: number;
  limit: number;
}

export function UsageWarning({ usage, limit }: UsageWarningProps) {
  const { tier } = useSubscription();

  if (limit === Infinity || tier === "elite") return null;

  const percent = Math.round((usage / limit) * 100);
  if (percent < 75) return null;

  return (
    <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p className="text-amber-200 text-sm">
        ⚠️ You&apos;ve used {usage} of {limit} applications this month ({percent}%).
        {percent >= 90
          ? " You're almost out — upgrade now to keep applying."
          : " Consider upgrading to Pro for 100 applications/month."}
      </p>
      <Link
        href="/pricing"
        className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-amber-700 text-white hover:bg-amber-600 transition"
      >
        Upgrade
      </Link>
    </div>
  );
}

interface PostApplicationNudgeProps {
  onDismiss: () => void;
}

export function PostApplicationNudge({ onDismiss }: PostApplicationNudgeProps) {
  const { tier, applicationsRemaining } = useSubscription();

  if (tier !== "free" || applicationsRemaining === Infinity) return null;

  return (
    <div className="bg-green-900/30 border border-green-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p className="text-green-200 text-sm">
        ✅ Application sent! You have {applicationsRemaining} free application{applicationsRemaining === 1 ? "" : "s"} remaining.
        Upgrade to Starter for 30 applications/month and auto-apply.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/pricing"
          className="px-4 py-1.5 rounded-full text-xs font-medium bg-green-700 text-white hover:bg-green-600 transition"
        >
          See Plans
        </Link>
        <button
          onClick={onDismiss}
          className="px-4 py-1.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
