import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "ApplyFlow - AI Job Application Assistant",
  description: "AI-powered resume builder, cover letter writer, and job discovery",
};

function Navbar() {
  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-zinc-100 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-lg tracking-tight">ApplyFlow</span>
          </Link>
        </div>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
          <SignedOut>
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
          </SignedOut>
          <SignedIn>
            <Link href="/discover" className="hover:text-zinc-900 transition-colors">Discover</Link>
            <Link href="/target-job" className="hover:text-zinc-900 transition-colors">Target Job</Link>
            <Link href="/applications" className="hover:text-zinc-900 transition-colors">Applications</Link>
            <Link href="/profile" className="hover:text-zinc-900 transition-colors">Profile</Link>
          </SignedIn>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link 
              href="/sign-in" 
              className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
            >
              Sign In
            </Link>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}