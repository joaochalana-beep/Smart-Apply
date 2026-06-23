"use client";

import Link from "next/link";
import { X, Lock, Check } from "lucide-react";
import { PlanTier, PLANS, formatPrice, getUpgradeBenefits } from "@/lib/subscription";

interface FeatureGateModalProps {
  featureName: string;
  requiredTier: PlanTier;
  currentTier: PlanTier;
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureGateModal({
  featureName,
  requiredTier,
  currentTier,
  isOpen,
  onClose,
}: FeatureGateModalProps) {
  if (!isOpen) return null;

  const targetPlan = PLANS[requiredTier];
  const currentPlan = PLANS[currentTier];
  const benefits = getUpgradeBenefits(requiredTier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upgrade Required</h2>
              <p className="text-sm text-zinc-400">Unlock {featureName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Your current plan</span>
              <span className="text-white font-medium">{currentPlan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Upgrade to</span>
              <span className="text-white font-medium">{targetPlan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Price</span>
              <span className="text-white font-medium">
                {formatPrice(targetPlan.priceMonthly)}/mo or {formatPrice(targetPlan.priceAnnual)}/yr
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-zinc-300 font-medium mb-3">What you&apos;ll unlock:</p>
            <ul className="space-y-2">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition"
          >
            Maybe Later
          </button>
          <Link
            href="/pricing"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 transition"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}
