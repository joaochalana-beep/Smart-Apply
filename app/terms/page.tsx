import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — ApplyWise",
  description: "Terms and Conditions for using the ApplyWise platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      <main className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Terms & Conditions</h1>
        <p className="text-zinc-500 mb-12">Last updated: June 21, 2026</p>

        <div className="prose prose-zinc max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-zinc-600 leading-relaxed">
              These Terms and Conditions (&quot;Terms&quot;) govern your use of the ApplyWise platform (&quot;Service&quot;), operated by ApplyWise (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By creating an account, subscribing to a paid plan, or using our Service, you agree to these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <p className="text-zinc-600 leading-relaxed">
              You must be at least 18 years old to use the Service. By using ApplyWise, you represent that you have the legal capacity to enter into a binding agreement. You may not use the Service if you have been previously terminated for violation of these Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">3. Service Description</h2>
            <p className="text-zinc-600 leading-relaxed">
              ApplyWise is an AI-powered job application platform that helps users discover job opportunities, generate optimized application documents (CVs and cover letters), and submit applications to employers. We do not guarantee employment, job offers, interviews, or employer responses. We are a technology tool, not an employment agency or recruiter.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">4. User Accounts & Responsibilities</h2>
            <p className="text-zinc-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. All information provided in your profile must be accurate and truthful. You may not create multiple accounts to circumvent usage limits. You may not share your account credentials with others. You are solely responsible for all activities conducted through your account.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">5. Acceptable Use Policy</h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-600 leading-relaxed">
              <li>Submit false, misleading, or fraudulent information in applications</li>
              <li>Use the Service to spam, harass, or send unsolicited communications</li>
              <li>Attempt to reverse engineer, scrape, or hack the platform</li>
              <li>Create fake profiles or impersonate others</li>
              <li>Use automated means (outside our provided tools) to access the Service</li>
              <li>Resell, sublicense, or commercially exploit the Service without authorization</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Use the Service for any illegal purpose</li>
            </ul>
            <p className="text-zinc-600 leading-relaxed mt-4">
              Violation of this policy will result in immediate account termination without refund, at our sole discretion.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">6. Subscriptions, Billing & Payments</h2>
            <div className="space-y-4 text-zinc-600 leading-relaxed">
              <p>
                <strong>6.1 Plans:</strong> We offer Free, Starter, Pro, and Elite subscription plans. Features and limits are as described on our Pricing page.
              </p>
              <p>
                <strong>6.2 Auto-Renewal:</strong> All paid subscriptions automatically renew at the end of each billing period (monthly or annually) unless cancelled before the renewal date. You will be charged using your registered payment method.
              </p>
              <p>
                <strong>6.3 Cancellation:</strong> You may cancel your subscription at any time from your Account Settings. For monthly plans, cancellation takes effect at the end of the current billing period. For annual plans, cancellation takes effect at the end of the current annual period. No partial refunds are given for early cancellation after the refund period.
              </p>
              <p>
                <strong>6.4 Price Changes:</strong> We may modify subscription prices with 30 days advance notice. Price changes will not affect your current billing period but will apply upon renewal, unless you cancel.
              </p>
              <p>
                <strong>6.5 Failed Payments:</strong> If payment fails, we will retry for 3 days. After that, your subscription will be downgraded to the Free plan.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">7. Refund Policy</h2>
            <div className="space-y-4 text-zinc-600 leading-relaxed">
              <p>
                <strong>7.1 Monthly Plans:</strong> Monthly subscriptions are non-refundable. If you cancel, you retain access until the end of your current billing period.
              </p>
              <p>
                <strong>7.2 Annual Plans:</strong> Annual subscriptions may be refunded in full if the refund request is made within 14 days of the initial purchase date. After 14 days, annual subscriptions are non-refundable.
              </p>
              <p>
                <strong>7.3 No Prorated Refunds:</strong> We do not provide prorated or partial refunds for unused applications, unused time, or downgrades. Application quotas reset monthly and do not roll over.
              </p>
              <p>
                <strong>7.4 Exceptions:</strong> Refunds may be granted in exceptional circumstances (e.g., billing error, duplicate charge) at our sole discretion. Contact support@applywise.site.
              </p>
              <p>
                <strong>7.5 Refund Method:</strong> Approved refunds will be processed to the original payment method within 10-14 business days.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">8. No Guarantee of Results</h2>
            <p className="text-zinc-600 leading-relaxed">
              ApplyWise does not guarantee that you will receive job offers, interviews, callbacks, or any response from employers. The Service improves the efficiency and quality of your applications, but hiring decisions are made solely by employers. Your results depend on your qualifications, the job market, and other factors outside our control.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">9. Intellectual Property</h2>
            <p className="text-zinc-600 leading-relaxed">
              All content, software, and technology on the ApplyWise platform are our property or licensed to us. You retain ownership of your profile data and generated application documents. We grant you a limited, non-exclusive, non-transferable license to use the Service during your subscription period.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">10. Data & Privacy</h2>
            <p className="text-zinc-600 leading-relaxed">
              Your use of the Service is also governed by our Privacy Policy. We process your data in accordance with GDPR and applicable data protection laws. You may export or delete your account data at any time. We retain application history for 12 months after account deletion for legal compliance purposes.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">11. Limitation of Liability</h2>
            <p className="text-zinc-600 leading-relaxed mb-4">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-600 leading-relaxed">
              <li>ApplyWise shall not be liable for any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim</li>
              <li>We are not liable for: lost job opportunities, employer rejections, suspension by job boards or LinkedIn, data loss caused by your actions, or third-party service interruptions</li>
            </ul>
            <p className="text-zinc-600 leading-relaxed mt-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">12. Indemnification</h2>
            <p className="text-zinc-600 leading-relaxed">
              You agree to indemnify and hold harmless ApplyWise, its officers, employees, and agents from any claims, damages, or expenses arising from your use of the Service, your violation of these Terms, or your infringement of any third-party rights.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">13. Termination</h2>
            <div className="space-y-4 text-zinc-600 leading-relaxed">
              <p>
                <strong>13.1 By You:</strong> You may delete your account at any time. Your data will be retained for 12 months as noted above, then permanently deleted.
              </p>
              <p>
                <strong>13.2 By Us:</strong> We may suspend or terminate your account immediately if you violate these Terms, engage in fraudulent activity, or misuse the Service. Termination for violation will result in forfeiture of any remaining subscription time without refund.
              </p>
              <p>
                <strong>13.3 Effect of Termination:</strong> Upon termination, your access to paid features will cease. Generated documents remain your property and should be downloaded before account closure.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">14. Governing Law & Disputes</h2>
            <p className="text-zinc-600 leading-relaxed">
              These Terms shall be governed by the laws of Portugal. Any disputes shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to the competent courts of Lisbon, Portugal.
            </p>
            <p className="text-zinc-600 leading-relaxed mt-4">
              For EU consumers: Nothing in these Terms affects your statutory rights under EU consumer protection law, including the 14-day withdrawal right for distance contracts.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">15. Modifications to Terms</h2>
            <p className="text-zinc-600 leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes via email or in-app notification at least 30 days before they take effect. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">16. Contact</h2>
            <p className="text-zinc-600 leading-relaxed">
              For questions about these Terms, contact:{" "}
              <a href="mailto:legal@applywise.site" className="text-indigo-600 hover:underline">
                legal@applywise.site
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-100">
          <Link href="/" className="text-indigo-600 hover:underline font-medium">
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
