export type PlanTier = 'free' | 'starter' | 'pro' | 'elite';

export interface PlanConfig {
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  monthlyApplications: number;
  dailyLimit: number;
  jobMatches: number;
  locations: number;
  cvTemplates: number;
  atsScoreLevel: 'none' | 'basic' | 'advanced' | 'premium';
  autoApply: boolean;
  coverLetterOptimize: boolean;
  gapAnalysis: boolean;
  advancedAnalytics: boolean;
  emailSupport: boolean;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    monthlyApplications: 5,
    dailyLimit: 5,
    jobMatches: 10,
    locations: 1,
    cvTemplates: 1,
    atsScoreLevel: 'basic',
    autoApply: false,
    coverLetterOptimize: false,
    gapAnalysis: false,
    advancedAnalytics: false,
    emailSupport: false,
  },
  starter: {
    name: 'Starter',
    priceMonthly: 12.99,
    priceAnnual: 129,
    monthlyApplications: 30,
    dailyLimit: 5,
    jobMatches: 50,
    locations: 1,
    cvTemplates: 1,
    atsScoreLevel: 'basic',
    autoApply: true,
    coverLetterOptimize: false,
    gapAnalysis: false,
    advancedAnalytics: false,
    emailSupport: true,
  },
  pro: {
    name: 'Pro',
    priceMonthly: 29.99,
    priceAnnual: 299,
    monthlyApplications: 100,
    dailyLimit: 15,
    jobMatches: 200,
    locations: 5,
    cvTemplates: 3,
    atsScoreLevel: 'advanced',
    autoApply: true,
    coverLetterOptimize: true,
    gapAnalysis: true,
    advancedAnalytics: true,
    emailSupport: true,
  },
  elite: {
    name: 'Elite',
    priceMonthly: 49.99,
    priceAnnual: 499,
    monthlyApplications: Infinity,
    dailyLimit: Infinity,
    jobMatches: Infinity,
    locations: Infinity,
    cvTemplates: Infinity,
    atsScoreLevel: 'premium',
    autoApply: true,
    coverLetterOptimize: true,
    gapAnalysis: true,
    advancedAnalytics: true,
    emailSupport: true,
  },
};

// Feature gate — use throughout the app
export function canUseFeature(tier: PlanTier, feature: keyof PlanConfig): boolean {
  const plan = PLANS[tier];
  const value = plan[feature];

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value !== 'none';
  return false;
}

export function getLimit(tier: PlanTier, limitType: 'monthlyApplications' | 'dailyLimit' | 'jobMatches' | 'locations' | 'cvTemplates'): number {
  return PLANS[tier][limitType] as number;
}

export function isAtLimit(tier: PlanTier, usage: number, limitType: 'monthlyApplications' | 'dailyLimit' | 'jobMatches'): boolean {
  const limit = getLimit(tier, limitType);
  if (limit === Infinity) return false;
  return usage >= limit;
}

// User subscription model
export interface UserSubscription {
  tier: PlanTier;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  applicationsUsedThisMonth: number;
  applicationsResetDate: string;
  stripeSubscriptionId?: string;
  paypalSubscriptionId?: string;
}

export function getAnnualSavingsPercent(): number {
  return 17;
}

export function formatPrice(price: number): string {
  if (price === 0) return '€0';
  return `€${price.toFixed(2)}`;
}

export function formatLimit(limit: number): string {
  if (limit === Infinity) return 'Unlimited';
  return limit.toLocaleString();
}

export function getPlanFeatures(tier: PlanTier): { label: string; included: boolean; highlight?: boolean }[] {
  const plan = PLANS[tier];
  const isFree = tier === 'free';
  const countryLabel = plan.locations === 1 ? 'country' : 'countries';
  return [
    { label: isFree ? `${formatLimit(plan.monthlyApplications)} lifetime applications` : `${formatLimit(plan.monthlyApplications)} applications / month`, included: true, highlight: true },
    { label: `${formatLimit(plan.dailyLimit)} applications / day`, included: !isFree },
    { label: `${formatLimit(plan.jobMatches)} job matches`, included: true },
    { label: `${formatLimit(plan.locations)} ${countryLabel}`, included: plan.locations > 0 },
    { label: `${formatLimit(plan.cvTemplates)} CV template${plan.cvTemplates === 1 ? '' : 's'}`, included: plan.cvTemplates > 0 },
    { label: `${plan.atsScoreLevel} ATS optimization`, included: plan.atsScoreLevel !== 'none' },
    { label: 'Auto-apply', included: plan.autoApply },
    { label: 'Tailored cover letters', included: plan.coverLetterOptimize },
    { label: 'Gap analysis', included: plan.gapAnalysis },
    { label: 'Advanced analytics', included: plan.advancedAnalytics },
    { label: 'Email support', included: plan.emailSupport },
  ];
}

export function getComparisonFeatures(): { label: string; key: keyof PlanConfig; type: 'boolean' | 'limit' }[] {
  return [
    { label: 'Monthly applications', key: 'monthlyApplications', type: 'limit' },
    { label: 'Daily limit', key: 'dailyLimit', type: 'limit' },
    { label: 'Job matches', key: 'jobMatches', type: 'limit' },
    { label: 'Locations', key: 'locations', type: 'limit' },
    { label: 'CV templates', key: 'cvTemplates', type: 'limit' },
    { label: 'ATS score level', key: 'atsScoreLevel', type: 'boolean' },
    { label: 'Auto-apply', key: 'autoApply', type: 'boolean' },
    { label: 'Cover letter optimize', key: 'coverLetterOptimize', type: 'boolean' },
    { label: 'Gap analysis', key: 'gapAnalysis', type: 'boolean' },
    { label: 'Advanced analytics', key: 'advancedAnalytics', type: 'boolean' },
    { label: 'Email support', key: 'emailSupport', type: 'boolean' },
  ];
}

export function getUpgradeBenefits(targetTier: PlanTier): string[] {
  const plan = PLANS[targetTier];
  const benefits: string[] = [];
  benefits.push(`${formatLimit(plan.monthlyApplications)} applications per month`);
  if (plan.autoApply) benefits.push('Automatic job applications');
  if (plan.coverLetterOptimize) benefits.push('AI-optimized cover letters');
  if (plan.gapAnalysis) benefits.push('Skills gap analysis');
  if (plan.advancedAnalytics) benefits.push('Advanced application analytics');
  if (plan.emailSupport) benefits.push('Email support');
  return benefits.slice(0, 3);
}
