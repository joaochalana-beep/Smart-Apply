"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Shield } from "lucide-react";
import { FAQ } from "@/components/faq/FAQ";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  PlanTier,
  PLANS,
  getPlanFeatures,
  getComparisonFeatures,
  formatPrice,
  formatLimit,
  getAnnualSavingsPercent,
  canUseFeature,
} from "@/lib/subscription";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);
  const { tier: currentTier, updateSubscription } = useSubscription();

  const planOrder: ("free" | "starter" | "pro")[] = ["free", "starter", "pro"];

  async function handleSubscribe() {
    if (!selectedTier) return;

    // In a real app, this would redirect to Stripe/PayPal checkout.
    // For now, we simulate the subscription update.
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (billing === "monthly" ? 1 : 12));

    await updateSubscription({
      tier: selectedTier,
      status: "active",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      cancelAtPeriodEnd: false,
    });

    setSelectedTier(null);
    alert(`Subscribed to ${PLANS[selectedTier].name}!`);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Choose Your Plan
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10">
            Simple pricing. Powerful results. Start free, upgrade when you&apos;re ready.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 bg-zinc-100 rounded-full p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                billing === "monthly"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                billing === "annual"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Annual — Save {getAnnualSavingsPercent()}%
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {planOrder.map((tier) => (
              <PricingCard
                key={tier}
                tier={tier}
                billing={billing}
                isCurrent={currentTier === tier}
                onSelect={() => setSelectedTier(tier)}
              />
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              14-day money-back guarantee
            </div>
            <div>•</div>
            <div>Cancel anytime on monthly</div>
            <div>•</div>
            <div>No hidden fees</div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-6 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left p-4 font-semibold text-zinc-900">Feature</th>
                  {planOrder.map((tier) => (
                    <th key={tier} className="p-4 text-center font-semibold text-zinc-900 capitalize">
                      {PLANS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getComparisonFeatures().map((feature, idx) => (
                  <tr key={feature.key} className={idx % 2 === 0 ? "bg-zinc-50/50" : ""}>
                    <td className="p-4 text-sm text-zinc-600">{feature.label}</td>
                    {planOrder.map((tier) => (
                      <td key={tier} className="p-4 text-center">
                        {feature.type === "boolean" ? (
                          canUseFeature(tier, feature.key) ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )
                        ) : (
                          <span className="text-sm text-zinc-900">
                            {formatLimit(PLANS[tier][feature.key] as number)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-lg tracking-tight">ApplyWise</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/terms" className="hover:text-zinc-900">Terms & Conditions</Link>
            <Link href="#" className="hover:text-zinc-900">Privacy Policy</Link>
            <Link href="#" className="hover:text-zinc-900">Refund Policy</Link>
            <Link href="mailto:support@applywise.site" className="hover:text-zinc-900">Contact</Link>
          </div>
          <p className="text-sm text-zinc-400">
            © 2026 ApplyWise. Built for job seekers, by job seekers.
          </p>
        </div>
      </footer>

      {/* Subscription Modal */}
      {selectedTier && (
        <SubscriptionModal
          tier={selectedTier}
          billing={billing}
          isOpen={!!selectedTier}
          onClose={() => setSelectedTier(null)}
          onConfirm={handleSubscribe}
        />
      )}
    </div>
  );
}

function PricingCard({
  tier,
  billing,
  isCurrent,
  onSelect,
}: {
  tier: "free" | "starter" | "pro";
  billing: "monthly" | "annual";
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const plan = PLANS[tier];
  const price = billing === "monthly" ? plan.priceMonthly : plan.priceAnnual;
  const features = getPlanFeatures(tier).filter((f) => f.included);
  const isPopular = tier === "pro";

  return (
    <div
      className={`relative bg-white rounded-3xl border p-8 flex flex-col ${
        isPopular
          ? "border-indigo-500 shadow-xl shadow-indigo-500/10"
          : "border-zinc-200 hover:border-zinc-400"
      } transition-all`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{formatPrice(price)}</span>
          <span className="text-zinc-400">/{billing === "monthly" ? "mo" : "yr"}</span>
        </div>
        {tier === "free" && <p className="text-sm text-zinc-400 mt-1">Forever free</p>}
        {tier === "starter" && <p className="text-sm text-zinc-400 mt-1">or €{plan.priceAnnual}/yr</p>}
        {tier === "pro" && <p className="text-sm text-zinc-400 mt-1">or €{plan.priceAnnual}/yr</p>}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
            <span className="text-zinc-700">{feature.label}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`w-full py-3 rounded-full font-medium transition ${
          isCurrent
            ? "bg-zinc-100 text-zinc-400 cursor-default"
            : isPopular
            ? "bg-zinc-900 text-white hover:bg-zinc-800"
            : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        }`}
      >
        {isCurrent ? "Current Plan" : tier === "free" ? "Start Free" : "Subscribe"}
      </button>
    </div>
  );
}
