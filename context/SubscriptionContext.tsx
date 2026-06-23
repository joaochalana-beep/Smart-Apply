"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { PlanTier, UserSubscription, PLANS } from "@/lib/subscription";

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  tier: "free",
  status: "active",
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  applicationsUsedThisMonth: 0,
  applicationsResetDate: new Date().toISOString(),
};

interface SubscriptionContextValue {
  subscription: UserSubscription;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  updateSubscription: (sub: Partial<UserSubscription>) => Promise<void>;
  tier: PlanTier;
  applicationsRemaining: number;
  incrementApplicationsUsed: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

function normalizeSubscription(data: unknown): UserSubscription {
  const record = data as Record<string, unknown> | null;
  if (!record) return DEFAULT_SUBSCRIPTION;
  return {
    tier: (record.tier as PlanTier) || "free",
    status: (record.status as UserSubscription["status"]) || "active",
    currentPeriodStart: (record.current_period_start as string) || DEFAULT_SUBSCRIPTION.currentPeriodStart,
    currentPeriodEnd: (record.current_period_end as string) || DEFAULT_SUBSCRIPTION.currentPeriodEnd,
    cancelAtPeriodEnd: (record.cancel_at_period_end as boolean) ?? false,
    applicationsUsedThisMonth: (record.applications_used_this_month as number) ?? 0,
    applicationsResetDate: (record.applications_reset_date as string) || DEFAULT_SUBSCRIPTION.applicationsResetDate,
    stripeSubscriptionId: record.stripe_subscription_id as string | undefined,
    paypalSubscriptionId: record.paypal_subscription_id as string | undefined,
  };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription>(DEFAULT_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!isSignedIn) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(normalizeSubscription(data));
      } else {
        setSubscription(DEFAULT_SUBSCRIPTION);
      }
    } catch (err) {
      console.error("[Subscription] fetch error:", err);
      setSubscription(DEFAULT_SUBSCRIPTION);
    }
    setIsLoading(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      // Standard auth-dependent data fetch for the subscription context.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchSubscription();
    }
  }, [isLoaded, fetchSubscription]);

  const refreshSubscription = useCallback(async () => {
    setIsLoading(true);
    await fetchSubscription();
  }, [fetchSubscription]);

  const updateSubscription = useCallback(async (sub: Partial<UserSubscription>) => {
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: sub.tier,
          status: sub.status,
          current_period_start: sub.currentPeriodStart,
          current_period_end: sub.currentPeriodEnd,
          cancel_at_period_end: sub.cancelAtPeriodEnd,
          applications_used_this_month: sub.applicationsUsedThisMonth,
          applications_reset_date: sub.applicationsResetDate,
          stripe_subscription_id: sub.stripeSubscriptionId,
          paypal_subscription_id: sub.paypalSubscriptionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(normalizeSubscription(data));
      }
    } catch (err) {
      console.error("[Subscription] update error:", err);
    }
  }, []);

  const incrementApplicationsUsed = useCallback(async () => {
    setSubscription((prev) => {
      const updated = {
        ...prev,
        applicationsUsedThisMonth: prev.applicationsUsedThisMonth + 1,
      };
      // Sync in background
      fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applications_used_this_month: updated.applicationsUsedThisMonth,
          applications_reset_date: updated.applicationsResetDate,
        }),
      }).catch((err) => console.error("[Subscription] increment error:", err));
      return updated;
    });
  }, []);

  const plan = PLANS[subscription.tier];
  const applicationsRemaining =
    plan.monthlyApplications === Infinity
      ? Infinity
      : Math.max(0, plan.monthlyApplications - subscription.applicationsUsedThisMonth);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        refreshSubscription,
        updateSubscription,
        tier: subscription.tier,
        applicationsRemaining,
        incrementApplicationsUsed,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
