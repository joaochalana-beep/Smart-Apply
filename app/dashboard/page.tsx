"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { ApplicationActivity } from "@/components/dashboard/ApplicationActivity";
import { RecentNotifications } from "@/components/dashboard/RecentNotifications";
import { JobMatchesPreview } from "@/components/dashboard/JobMatchesPreview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ApplicationPipeline } from "@/components/dashboard/ApplicationPipeline";
import { RecommendedJobs } from "@/components/dashboard/RecommendedJobs";

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(75);
  const [jobsCount, setJobsCount] = useState(0);
  const [topMatches, setTopMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }

    async function loadData() {
      try {
        const [appsRes, profileRes, jobsCountRes, matchesRes] = await Promise.all([
          fetch("/api/applications"),
          fetch("/api/profile"),
          fetch("/api/jobs?limit=1"),
          fetch("/api/jobs?sort_by=match_score&sort_order=desc&limit=5"),
        ]);

        if (appsRes.ok) {
          const apps = await appsRes.json();
          if (Array.isArray(apps)) setApplications(apps);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          const fields = [
            profileData?.full_name,
            profileData?.email,
            profileData?.desired_role,
            profileData?.desired_location,
            profileData?.experience_level,
            profileData?.skills,
            profileData?.summary,
          ];
          const filled = fields.filter(Boolean).length;
          setProfileCompletion(Math.round((filled / fields.length) * 100));
        }

        if (jobsCountRes.ok) {
          const jobsData = await jobsCountRes.json();
          setJobsCount(jobsData.count || jobsData.jobs?.length || 0);
        }

        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          const jobs = matchesData.jobs || [];
          const mapped = jobs.map((job: any) => ({
            id: job.id,
            title: job.title || job.role || "Unknown Role",
            company: job.company || "Unknown",
            location: job.location || "Unknown",
            match_score: job.match_score || 0,
          }));
          setTopMatches(mapped);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
      setLoading(false);
    }

    if (isSignedIn) {
      loadData();
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(
    (a) => a.status === "sent" || a.status === "viewed" || a.status === "prepared"
  ).length;

  const profileSummary = [
    profile?.experience_level || "entry",
    profile?.work_type || "remote",
    (profile?.desired_role || "Trust & Safety / KYC / Compliance").split(";")[0],
  ].join(", ");

  // Derive the next target-job action from existing data
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const preparedApps = applications.filter((a) => a.status === "prepared");
  const staleApps = applications.filter(
    (a) =>
      (a.status === "sent" || a.status === "viewed") &&
      now - new Date(a.sent_at || Date.now()).getTime() > THREE_DAYS_MS
  );

  let nextTargetLabel = "Set a target job";
  if (preparedApps.length > 0) {
    const latest = preparedApps.sort(
      (a, b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime()
    )[0];
    nextTargetLabel = `Apply to ${latest.company || "company"}`;
  } else if (staleApps.length > 0) {
    const latest = staleApps.sort(
      (a, b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime()
    )[0];
    nextTargetLabel = `Follow up with ${latest.company || "company"}`;
  } else if (profile?.desired_role) {
    const role = profile.desired_role.split(";")[0].trim();
    nextTargetLabel = `Find ${role} roles`;
  }

  return (
    <DashboardLayout>
      <WelcomeHeader />

      <StatCards
        profileCompletion={profileCompletion}
        newJobs={jobsCount}
        nextTargetDue={nextTargetLabel}
        pendingApplications={pendingApplications}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ApplicationActivity applications={applications} />
        <RecentNotifications />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <JobMatchesPreview matches={topMatches} />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      <ApplicationPipeline applications={applications} />

      <RecommendedJobs jobs={topMatches.slice(0, 3)} profileSummary={profileSummary} />
    </DashboardLayout>
  );
}
