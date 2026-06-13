import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { AuthNav } from "@/components/auth-nav";
import "./globals.css";

export const metadata = {
  title: "ApplyFlow - AI Job Application Assistant",
  description: "AI-powered resume builder, cover letter writer, and job discovery",
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
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
                <NavLinks />
              </div>

              {/* Right side - keep your existing auth-nav */}
              <div className="flex items-center gap-4">
                <AuthNav />
              </div>
            </div>
          </nav>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}