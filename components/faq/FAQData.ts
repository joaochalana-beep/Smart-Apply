export interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

export const faqs: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'What is ApplyWise and how does it work?',
    answer: 'ApplyWise is an AI-powered job application platform that helps you find relevant jobs and apply automatically. Our system matches your profile with job postings, generates ATS-optimized CVs and cover letters, and submits applications on your behalf — all while giving you full control to review and edit before sending.',
  },
  {
    category: 'Getting Started',
    question: 'Is ApplyWise free to use?',
    answer: 'Yes! We offer a Free plan with 5 lifetime applications so you can try the platform risk-free. No credit card required. Upgrade anytime to unlock more applications and premium features.',
  },
  {
    category: 'Getting Started',
    question: 'How do I get started?',
    answer: 'Simply sign up, complete your profile with your experience and skills, set your job preferences (roles, locations, salary), and start discovering matched jobs. Click "Prepare & Apply" on any job to see your ATS score and generated application.',
  },
  {
    category: 'Applications',
    question: 'How does auto-apply work?',
    answer: 'Auto-apply scans for jobs matching your profile with a high score (80%+). When enabled, it automatically prepares optimized applications and submits them for you, up to your plan\'s daily and monthly limits. You can review each application in your inbox and track company responses.',
  },
  {
    category: 'Applications',
    question: 'Will companies know I used ApplyWise?',
    answer: 'Applications are sent from your personalized @applywise.site email address and include your name. The email footer mentions "Submitted via ApplyWise" for transparency. Our ATS-optimized documents are designed to pass through company screening systems naturally.',
  },
  {
    category: 'Applications',
    question: 'What happens after I apply?',
    answer: 'Company responses are received directly in your ApplyWise inbox. You\'ll see confirmation emails, interview invitations, and other updates all in one place. We also update your application pipeline automatically when companies respond.',
  },
  {
    category: 'CV & Cover Letter',
    question: 'What is the ATS Score?',
    answer: 'The ATS (Applicant Tracking System) Score measures how well your application matches a specific job posting. It analyzes keywords, skills, experience, and formatting to predict your chances of passing automated screening. Higher scores mean better chances of getting noticed by recruiters.',
  },
  {
    category: 'CV & Cover Letter',
    question: 'Can I edit the generated CV and cover letter?',
    answer: 'Absolutely! Before submitting any application, you can review and edit both your CV and cover letter. We encourage personalization to ensure your application reflects your unique experience and voice.',
  },
  {
    category: 'CV & Cover Letter',
    question: 'How is my CV optimized for ATS systems?',
    answer: 'Our AI tailors your CV for each job by incorporating relevant keywords, matching skills, and proper formatting that ATS systems prefer. We use clean, single-column layouts with standard headings — no graphics, tables, or fancy formatting that confuse parsers.',
  },
  {
    category: 'Billing',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Monthly subscriptions can be cancelled anytime and remain active until the end of your current billing period. Annual subscriptions can also be cancelled anytime but are non-refundable after 14 days, as stated in our Terms & Conditions.',
  },
  {
    category: 'Billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) through our secure payment processor. PayPal and MB Way (for Portugal) coming soon.',
  },
  {
    category: 'Billing',
    question: 'Can I change my plan?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time from your dashboard. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle.',
  },
  {
    category: 'Privacy & Support',
    question: 'Is my data safe?',
    answer: 'Yes. We use industry-standard encryption for all data transmission and storage. Your profile information is never shared with third parties. We are GDPR compliant and committed to protecting your privacy.',
  },
  {
    category: 'Privacy & Support',
    question: 'Who can see my profile information?',
    answer: 'Only you can see your full profile. The information you provide is used solely to generate your applications. We do not share, sell, or distribute your personal data to any third parties.',
  },
  {
    category: 'Privacy & Support',
    question: 'I have a problem — how do I contact support?',
    answer: 'Free users can browse our Help Center. Starter and Pro plan users get email support. Contact us at support@applywise.site.',
  },
];
