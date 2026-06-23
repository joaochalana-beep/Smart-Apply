"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Check, Shield } from "lucide-react";
import { FAQ } from "@/components/faq/FAQ";
import { PLANS, getPlanFeatures, formatPrice, getAnnualSavingsPercent } from "@/lib/subscription";

function FeatureCard({ 
  icon, 
  title, 
  description, 
  href,
  comingSoon = false 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  href: string;
  comingSoon?: boolean;
}) {
  const content = (
    <div className="bg-white rounded-2xl border border-zinc-200 p-8 hover:border-zinc-400 hover:shadow-lg transition-all h-full">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
      {comingSoon && (
        <span className="inline-block mt-3 text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full">
          Coming Soon
        </span>
      )}
    </div>
  );

  if (comingSoon) {
    return <div className="cursor-default">{content}</div>;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function HomePricingCard({
  tier,
  billing,
}: {
  tier: "free" | "starter" | "pro";
  billing: "monthly" | "annual";
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
          : "border-zinc-200"
      }`}
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
    </div>
  );
}

function HomePricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const planOrder: ("free" | "starter" | "pro")[] = ["free", "starter", "pro"];

  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Simple Pricing
        </h2>
        <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
          Start free. Upgrade when you&apos;re ready.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-2 bg-zinc-200 rounded-full p-1">
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

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {planOrder.map((tier) => (
          <HomePricingCard key={tier} tier={tier} billing={billing} />
        ))}
      </div>

      {/* Trust & CTA */}
      <div className="text-center space-y-6">
        <p className="text-sm text-zinc-500 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          14-day money-back guarantee on all paid plans. Cancel anytime.
        </p>
        <Link
          href="/pricing"
          className="inline-block bg-zinc-900 text-white px-8 py-3 rounded-full font-medium hover:bg-zinc-800 transition"
        >
          View Full Comparison
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-zinc-100 rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Now Live — Start Applying Smarter
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Land Your Dream Job{" "}
            <span className="text-zinc-400">Without the Grind</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
            AI-powered resume builder, cover letter writer, job discovery, and application tracker — 
            all in one place. <strong>Powerful tools without the premium price tag.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/discover"
              className="bg-zinc-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-800 transition-colors w-full sm:w-auto"
            >
              Discover Jobs
            </Link>
            <Link 
              href="/resume" 
              className="bg-white text-zinc-900 border border-zinc-200 px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-50 transition-colors w-full sm:w-auto"
            >
              Build Your Resume
            </Link>
          </div>
          <p className="text-sm text-zinc-400 mt-4">No credit card required. Get started free.</p>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-12 border-y border-zinc-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-zinc-900">10x</div>
              <div className="text-sm text-zinc-500 mt-1">Faster Applications</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900">85%</div>
              <div className="text-sm text-zinc-500 mt-1">Interview Success Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900">3min</div>
              <div className="text-sm text-zinc-500 mt-1">Per Application</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900">€0</div>
              <div className="text-sm text-zinc-500 mt-1">To Get Started</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything You Need to Get Hired
            </h2>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
              Stop copy-pasting into dozens of job boards. ApplyWise automates the boring stuff so you can focus on interviews.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="📝"
              title="AI Resume Builder"
              description="Paste your experience and let AI craft an ATS-optimized resume tailored to each job description."
              href="/resume"
            />
            <FeatureCard 
              icon="✉️"
              title="Cover Letter Writer"
              description="Generate personalized cover letters in seconds. No more generic templates that get ignored."
              href="/target-job"
            />
            <FeatureCard 
              icon="🎯"
              title="Smart Job Tracker"
              description="Track every application, follow-up, and interview in one clean dashboard. Never lose an opportunity."
              href="/applications"
            />
            <FeatureCard 
              icon="🤖"
              title="Auto-Apply"
              description="Discover matching jobs and apply with one click using customized resumes and cover letters."
              href="/discover"
            />
            <FeatureCard 
              icon="🎤"
              title="Interview Prep"
              description="AI-generated mock interviews based on the job role. Practice until you're confident."
              href="/"
              comingSoon
            />
            <FeatureCard 
              icon="📊"
              title="Salary Insights"
              description="Know what you're worth. Get real-time salary data for every role you apply to."
              href="/"
              comingSoon
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <HomePricing />
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to Land Your Next Role?
          </h2>
          <p className="text-zinc-500 text-lg mb-8">
            Join thousands of job seekers who cut their application time in half.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/discover"
              className="bg-zinc-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-800 transition-colors w-full sm:w-auto"
            >
              Start Discovering Jobs
            </Link>
            <Link 
              href="/profile"
              className="bg-white text-zinc-900 border border-zinc-200 px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-50 transition-colors w-full sm:w-auto"
            >
              Set Up Your Profile
            </Link>
          </div>
        </div>
      </section>

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
            <Link href="/pricing" className="hover:text-zinc-900">Pricing</Link>
            <Link href="/terms" className="hover:text-zinc-900">Terms & Conditions</Link>
            <Link href="#" className="hover:text-zinc-900">Privacy Policy</Link>
            <Link href="mailto:support@applywise.site" className="hover:text-zinc-900">Contact</Link>
          </div>
          <p className="text-sm text-zinc-400">
            © 2026 ApplyWise. Built for job seekers, by job seekers.
          </p>
        </div>
      </footer>
    </div>
  );
}