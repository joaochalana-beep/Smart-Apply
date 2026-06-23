"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Check, FileText, Shield } from "lucide-react";
import { PlanTier, PLANS, formatPrice } from "@/lib/subscription";

interface SubscriptionModalProps {
  tier: PlanTier;
  billing: "monthly" | "annual";
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SubscriptionModal({
  tier,
  billing,
  isOpen,
  onClose,
  onConfirm,
}: SubscriptionModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const plan = PLANS[tier];
  const price = billing === "monthly" ? plan.priceMonthly : plan.priceAnnual;
  const period = billing === "monthly" ? "month" : "year";
  const isPaid = price > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Before You Subscribe</h2>
              <p className="text-sm text-zinc-400">{plan.name} plan</p>
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
          <div className="space-y-3">
            {[
              `Your subscription will auto-renew every ${period}`,
              "You can cancel anytime from your Account Settings",
              billing === "monthly"
                ? "Monthly plans are non-refundable for partial months"
                : "Annual plans have a 14-day refund window from purchase date",
              "Unused applications do not roll over",
              "We do not guarantee job offers or employer responses",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-zinc-300">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Shield className="w-4 h-4 text-zinc-500" />
            <p className="text-zinc-400">
              By subscribing, you agree to our{" "}
              <Link href="/terms" className="text-indigo-400 hover:underline" target="_blank">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-indigo-400 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <label className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-zinc-300">
              I have read and agree to the Terms & Conditions and Privacy Policy
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreed}
            className="px-6 py-2.5 rounded-full text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPaid ? `Agree & Pay ${formatPrice(price)}/${billing === "monthly" ? "mo" : "yr"}` : "Start Free"}
          </button>
        </div>
      </div>
    </div>
  );
}
