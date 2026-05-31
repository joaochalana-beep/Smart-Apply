import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-zinc-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Smart Apply</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
          </div>
          <Link 
            href="#waitlist"
            className="bg-zinc-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-zinc-100 rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Launching Soon — Be the First to Try It
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Land Your Dream Job{" "}
            <span className="text-zinc-400">Without the Grind</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
            AI-powered resume builder, cover letter writer, and application tracker — 
            all in one place. <strong>Smarter than AI Apply, at a fraction of the cost.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="#waitlist"
              className="bg-zinc-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-800 transition-colors w-full sm:w-auto"
            >
              Join the Free Waitlist
            </Link>
            <a 
              href="#features" 
              className="bg-white text-zinc-900 border border-zinc-200 px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-50 transition-colors w-full sm:w-auto"
            >
              See How It Works
            </a>
          </div>
          <p className="text-sm text-zinc-400 mt-4">No credit card required. Cancel anytime.</p>
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
              <div className="text-3xl font-bold text-zinc-900">$0</div>
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
              Stop copy-pasting into 50 different job boards. Smart Apply automates the boring stuff so you can focus on interviews.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="📝"
              title="AI Resume Builder"
              description="Paste your experience and let AI craft an ATS-optimized resume tailored to each job description."
            />
            <FeatureCard 
              icon="✉️"
              title="Cover Letter Writer"
              description="Generate personalized cover letters in seconds. No more generic templates that get ignored."
            />
            <FeatureCard 
              icon="🎯"
              title="Smart Job Tracker"
              description="Track every application, follow-up, and interview in one clean dashboard. Never lose an opportunity."
            />
            <FeatureCard 
              icon="🤖"
              title="Auto-Apply (Coming Soon)"
              description="One-click apply to multiple jobs with customized applications. Save hours every week."
            />
            <FeatureCard 
              icon="🎤"
              title="Interview Prep"
              description="AI-generated mock interviews based on the job role. Practice until you're confident."
            />
            <FeatureCard 
              icon="📊"
              title="Salary Insights"
              description="Know what you're worth. Get real-time salary data for every role you apply to."
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
              AI Apply charges $29/month + extra for auto-apply. We think that's unfair.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 border-b md:border-b-0 md:border-r border-zinc-200">
                <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Them</div>
                <div className="text-3xl font-bold text-zinc-900 mb-1">$29<span className="text-lg text-zinc-400">/mo</span></div>
                <div className="text-sm text-zinc-500 mb-6">+ extra credits for auto-apply</div>
                <ul className="space-y-3 text-sm text-zinc-500">
                  <li className="flex items-center gap-2">❌ Limited resume generations</li>
                  <li className="flex items-center gap-2">❌ Pay per auto-apply</li>
                  <li className="flex items-center gap-2">❌ No interview prep</li>
                  <li className="flex items-center gap-2">❌ Basic job tracker</li>
                </ul>
              </div>
              <div className="p-8 bg-zinc-900 text-white">
                <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Smart Apply</div>
                <div className="text-3xl font-bold mb-1">$9<span className="text-lg text-zinc-400">/mo</span></div>
                <div className="text-sm text-zinc-400 mb-6">Everything included. No hidden fees.</div>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2">✅ Unlimited AI resumes</li>
                  <li className="flex items-center gap-2">✅ Auto-apply included</li>
                  <li className="flex items-center gap-2">✅ Interview prep suite</li>
                  <li className="flex items-center gap-2">✅ Advanced analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist / CTA Section */}
      <section id="waitlist" className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Be Among the First
          </h2>
          <p className="text-zinc-500 text-lg mb-8">
            Join the waitlist today and get <strong>3 months free</strong> when we launch. No strings attached.
          </p>
                    <a 
            href="https://tally.so/r/PdkvWP" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex bg-zinc-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-800 transition-colors"
          >
            Join the Waitlist — It's Free
          </a>
          <p className="text-xs text-zinc-400 mt-4">
            We hate spam too. Unsubscribe anytime. Launching Q3 2026.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-zinc-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FAQItem 
              question="How is this different from AI Apply?"
              answer="We offer the same core features — AI resumes, cover letters, and auto-apply — but at a fair price. No hidden credit systems. No paywalls for basic features."
            />
            <FAQItem 
              question="Is it really free to start?"
              answer="Yes. Join the waitlist and you'll get 3 months of Pro free at launch. After that, choose our affordable Pro plan or stay on the free tier."
            />
            <FAQItem 
              question="Will auto-apply work with LinkedIn, Indeed, etc.?"
              answer="We're building integrations with all major job boards. LinkedIn and Indeed will be supported at launch, with more platforms added weekly."
            />
            <FAQItem 
              question="Is my data safe?"
              answer="Absolutely. We never sell your data. Your resume and personal information are encrypted and only used to generate your applications."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-semibold text-sm">Smart Apply</span>
          </div>
          <div className="text-sm text-zinc-400">
            © 2026 Smart Apply. Built for job seekers, by job seekers.
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-900 transition-colors">Twitter</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">GitHub</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-lg transition-all duration-300">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <h3 className="font-semibold text-base mb-2">{question}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{answer}</p>
    </div>
  );
}