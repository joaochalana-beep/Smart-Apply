"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Calendar, AlertCircle, Check, Download, Loader2 } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";
import { PLANS, formatPrice, formatLimit } from "@/lib/subscription";

export default function SubscriptionManagementPage() {
  const { subscription, tier, applicationsRemaining, refreshSubscription, updateSubscription } = useSubscription();
  const [cancelling, setCancelling] = useState(false);

  const plan = PLANS[tier];
  const isPaid = plan.priceMonthly > 0;
  const renewalDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const used = subscription.applicationsUsedThisMonth;
  const total = plan.monthlyApplications;
  const percent = total === Infinity ? 0 : Math.min(100, Math.round((used / total) * 100));

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel? You'll keep access until the end of your current billing period.")) {
      return;
    }
    setCancelling(true);
    await updateSubscription({ cancelAtPeriodEnd: true });
    setCancelling(false);
    await refreshSubscription();
  }

  const billingHistory = [
    { date: "Jun 22, 2026", description: `${plan.name} Monthly`, amount: formatPrice(plan.priceMonthly), status: "Paid" },
    { date: "May 22, 2026", description: `${plan.name} Monthly`, amount: formatPrice(plan.priceMonthly), status: "Paid" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pt-24 md:p-10 md:pt-28">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription</h1>
          <p className="text-zinc-400">Manage your plan, usage, and billing.</p>
        </div>

        {/* Current Plan */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Current Plan</p>
              <h2 className="text-2xl font-bold">
                {plan.name}{" "}
                {isPaid && (
                  <span className="text-base font-normal text-zinc-400">
                    {formatPrice(plan.priceMonthly)}/month
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  {subscription.status === "active" ? "Active" : subscription.status}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
                    Cancels on {renewalDate}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/pricing"
                className="px-5 py-2 rounded-full text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 transition"
              >
                {tier === "elite" ? "Change Plan" : "Upgrade Plan"}
              </Link>
              {isPaid && !subscription.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-5 py-2 rounded-full text-sm font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition disabled:opacity-50"
                >
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Subscription"}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar className="w-4 h-4" />
            {subscription.cancelAtPeriodEnd ? (
              <span>Access ends on {renewalDate}</span>
            ) : (
              <span>Renews on {renewalDate}</span>
            )}
          </div>
        </div>

        {/* Usage */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Applications</span>
                <span className="text-white font-medium">
                  {used} / {formatLimit(total)} used
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    percent >= 90 ? "bg-red-500" : percent >= 75 ? "bg-amber-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              {applicationsRemaining !== Infinity && applicationsRemaining <= 5 && (
                <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Only {applicationsRemaining} application{applicationsRemaining === 1 ? "" : "s"} remaining this month.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <CreditCard className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-white font-medium">•••• 4242 (Visa)</p>
                <p className="text-zinc-500 text-sm">Expires 08/2027</p>
              </div>
            </div>
            <button
              onClick={() => alert("Payment method update coming soon")}
              className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition"
            >
              Update
            </button>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Billing History</h3>
          <div className="space-y-3">
            {billingHistory.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl"
              >
                <div>
                  <p className="text-white font-medium">{item.description}</p>
                  <p className="text-zinc-500 text-sm">{item.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{item.amount}</p>
                  <p className="text-green-400 text-sm flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> {item.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => alert("Invoice download coming soon")}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition"
          >
            <Download className="w-4 h-4" />
            Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
