import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { AuthNav } from "@/components/auth-nav";
import { InboxProvider } from "@/context/InboxContext";
import "./globals.css";

export const metadata = {
  title: "ApplyWise - AI Job Application Assistant",
  description: "AI-powered resume builder, cover letter writer, and job discovery",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <InboxProvider>
        <html lang="en">
          <body className="antialiased">
            <nav className="fixed top-0 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 z-50">
              <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-zinc-950 font-bold text-sm">A</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white">ApplyWise</span>
                  </Link>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                  <NavLinks />
                </div>

                <div className="flex items-center gap-4">
                  <AuthNav />
                </div>
              </div>
            </nav>
            <div className="pt-16">
              {children}
            </div>
          </body>
        </html>
      </InboxProvider>
    </ClerkProvider>
  );
}