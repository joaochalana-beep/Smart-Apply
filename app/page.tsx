"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

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
              Stop copy-pasting into dozens of job boards. ApplyFlow automates the boring stuff so you can focus on interviews.
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

      {/* Comparison Section */}
      <section className="py-24 px-6 bg-zinc-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Why Pay More for Less?
            </h2>
            <p className="text-zinc-500 text-lg">
              Most platforms hide their best features behind expensive paywalls and credit systems. We think that's unfair.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 border-b md:border-b-0 md:border-r border-zinc-200">
                <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Other Platforms</div>
                <div className="text-3xl font-bold text-zinc-900 mb-1">€25-35<span className="text-lg text-zinc-400">/mo</span></div>
                <div className="text-sm text-zinc-500 mb-6">+ extra credits for auto-apply</div>
                <ul className="space-y-3 text-sm text-zinc-500">
                  <li className="flex items-center gap-2">❌ Limited resume generations</li>
                  <li className="flex items-center gap-2">❌ Pay per application</li>
                  <li className="flex items-center gap-2">❌ Generic cover letters</li>
                  <li className="flex items-center gap-2">❌ No job discovery</li>
                </ul>
              </div>
              <div className="p-8">
                <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">ApplyFlow</div>
                <div className="text-3xl font-bold text-zinc-900 mb-1">€0<span className="text-lg text-zinc-400">/mo</span></div>
                <div className="text-sm text-zinc-500 mb-6">Free while in beta</div>
                <ul className="space-y-3 text-sm text-zinc-900">
                  <li className="flex items-center gap-2">✅ Unlimited AI resumes</li>
                  <li className="flex items-center gap-2">✅ Tailored cover letters</li>
                  <li className="flex items-center gap-2">✅ Job discovery & matching</li>
                  <li className="flex items-center gap-2">✅ Full application tracker</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <span className="font-bold text-lg tracking-tight">ApplyFlow</span>
          </div>
          <p className="text-sm text-zinc-400">
            © 2026 ApplyFlow. Built for job seekers, by job seekers.
          </p>
        </div>
      </footer>
    </div>
  );
}