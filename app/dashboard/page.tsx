"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { ApplicationActivity } from "@/components/dashboard/ApplicationActivity";
import { RecentNotifications } from "@/components/dashboard/RecentNotifications";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ApplicationPipeline } from "@/components/dashboard/ApplicationPipeline";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RecommendedJobs } from "@/components/dashboard/RecommendedJobs";
import { AutoApply, getAutoApplySettings, incrementAutoApply } from "@/components/dashboard/AutoApply";
import { useInbox } from "@/context/InboxContext";
import { runATSEngine, cleanJobId, JobData, UserProfile } from "@/lib/ats-engine";

interface DiscoverJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  match_score: number;
  salary?: string;
  work_type?: string;
  job_type?: string;
  experience_level?: string;
}

interface StoredApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyId: string;
  location: string;
  coverLetter: string;
  cvContent: string;
  atsScore: number;
  status: string;
  appliedAt: string;
  matchScore: number;
  followUpDate: string | null;
  isAutoApplied: boolean;
}

const APPLICATIONS_STORAGE_KEY = "applyflow-applications";

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { addMessage } = useInbox();
  const [applications, setApplications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(75);
  const [jobsCount, setJobsCount] = useState(0);
  const [allJobs, setAllJobs] = useState<DiscoverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoApplyRunning, setAutoApplyRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadStoredApplications = useCallback(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(APPLICATIONS_STORAGE_KEY) || "[]") as StoredApplication[];
    } catch {
      return [];
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, profileRes, jobsCountRes, discoverRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/profile"),
        fetch("/api/jobs?limit=1"),
        fetch("/api/discover"),
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

      if (discoverRes.ok) {
        const discoverData = await discoverRes.json();
        const jobs = (discoverData.jobs || []).map((job: any) => ({
          id: job.id,
          title: job.title || job.role || "Unknown Role",
          company: job.company || "Unknown Company",
          location: job.location || "Unknown",
          description: job.description || "",
          url: job.url || "#",
          match_score: job.match_score || 0,
          salary: job.salary,
          work_type: job.work_type,
          job_type: job.job_type,
          experience_level: job.experience_level,
        }));
        setAllJobs(jobs);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (isSignedIn) {
      fetchData();
    }
  }, [isLoaded, isSignedIn, router, fetchData]);

  const pendingApplications = applications.filter(
    (a) => a.status === "sent" || a.status === "viewed" || a.status === "prepared"
  ).length;

  const profileSummary = [
    profile?.experience_level || "entry",
    profile?.work_type || "remote",
    (profile?.desired_role || "Trust & Safety / KYC / Compliance").split(";")[0],
  ].join(", ");

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

  async function saveApplicationToServer(
    job: DiscoverJob,
    result: ReturnType<typeof runATSEngine>,
    isAutoApplied = false,
    editedCV?: string,
    editedCoverLetter?: string
  ) {
    const cleanId = cleanJobId(job.id);
    const finalCV = editedCV || result.cv;
    const finalCoverLetter = editedCoverLetter || result.coverLetter;
    const appRes = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: cleanId,
        company: job.company,
        role: job.title,
        job_url: job.url,
        resume_text: finalCV,
        cover_letter: finalCoverLetter,
        ats_score: result.atsScore,
        method: isAutoApplied ? "auto" : "one_click",
        status: "sent",
      }),
    });

    if (!appRes.ok) {
      const appData = await appRes.json();
      throw new Error(appData.error || "Failed to save application");
    }

    const saved = await appRes.json();

    const stored: StoredApplication = {
      id: saved.id || `local_${Date.now()}`,
      jobId: cleanId,
      jobTitle: job.title,
      companyName: job.company,
      companyId: cleanId,
      location: job.location,
      coverLetter: finalCoverLetter,
      cvContent: finalCV,
      atsScore: result.atsScore,
      status: "applied",
      appliedAt: new Date().toISOString(),
      matchScore: job.match_score,
      followUpDate: null,
      isAutoApplied,
    };

    if (typeof window !== "undefined") {
      const existing = loadStoredApplications();
      existing.push(stored);
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(existing));
    }

    addMessage({
      applicationId: saved.id || stored.id,
      jobTitle: job.title,
      companyName: job.company,
      subject: `Application submitted to ${job.company} for ${job.title}`,
      body: `Your ATS-optimized application (Score: ${result.atsScore}%) was submitted on ${new Date().toLocaleDateString()}. We will notify you when the employer responds.`,
      type: "confirmation",
      status: "unread",
      from: "system",
    });

    return saved;
  }

  const runAutoApply = useCallback(async () => {
    if (autoApplyRunning) return;
    const settings = getAutoApplySettings();
    if (!settings.enabled) return;
    if (!profile) return;

    setAutoApplyRunning(true);
    try {
      const stored = loadStoredApplications();
      const appliedJobIds = new Set(stored.map((a) => a.jobId));

      const eligible = allJobs
        .filter((job) => job.match_score >= 80 && !appliedJobIds.has(cleanJobId(job.id)))
        .sort((a, b) => b.match_score - a.match_score);

      const remaining = Math.max(0, settings.dailyLimit - settings.appliedToday);
      const toApply = eligible.slice(0, remaining);
      let applied = 0;

      for (const job of toApply) {
        const jobData: JobData = {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          url: job.url,
          match_score: job.match_score,
        };
        const result = runATSEngine(jobData, profile as UserProfile, job.match_score);
        await saveApplicationToServer(job, result, true);
        incrementAutoApply(job.title, job.company);
        applied++;
      }

      if (applied > 0) {
        showToast(`Auto-applied to ${applied} job${applied === 1 ? "" : "s"} today!`);
        // Refresh applications
        const appsRes = await fetch("/api/applications");
        if (appsRes.ok) {
          const apps = await appsRes.json();
          if (Array.isArray(apps)) setApplications(apps);
        }
      }
    } catch (err) {
      console.error("Auto apply error:", err);
    }
    setAutoApplyRunning(false);
  }, [allJobs, profile, autoApplyRunning, loadStoredApplications, addMessage]);

  // Trigger auto-apply when settings are enabled and dashboard loads
  useEffect(() => {
    if (!loading && profile && allJobs.length > 0) {
      const settings = getAutoApplySettings();
      if (settings.enabled && settings.appliedToday < settings.dailyLimit) {
        runAutoApply();
      }
    }
  }, [loading, profile, allJobs, runAutoApply]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

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

  return (
    <DashboardLayout>
      <WelcomeHeader />

      <AutoApply onAutoApply={runAutoApply} />

      <RecommendedJobs
        jobs={allJobs}
        profileSummary={profileSummary}
        onRefresh={fetchData}
        loading={loading}
      />

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

      <ApplicationPipeline applications={applications} />

      <QuickActions />

      <RecentActivity applications={applications} />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </DashboardLayout>
  );
}
