"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import LeaderboardTableSkeleton from "@/components/dashboard/LeaderboardTableSkeleton";
import RecentResultsList from "@/components/dashboard/RecentResultsList";
import StudentDashboardQuickActions from "@/components/dashboard/StudentDashboardQuickActions";
import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import UserStatsPanelSkeleton from "@/components/dashboard/UserStatsPanelSkeleton";
import { fetchDashboardUserResults, fetchDashboardUserStats, fetchLeaderboard } from "@/lib/services/dashboardService";
import type { LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [userStats, setUserStats] = useState<UserStatsSummary>({ testsTaken: 0, highestScore: 0 });
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.role) {
      return;
    }

    if (session.user.role === "PARENT") {
      router.replace("/parent/dashboard");
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [stats, results, board] = await Promise.all([
          fetchDashboardUserStats(),
          fetchDashboardUserResults(30),
          fetchLeaderboard(),
        ]);

        if (cancelled) {
          return;
        }

        setUserStats(stats);
        setUserResults(results);
        setLeaderboard(board);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load student dashboard", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router, session?.user?.role, status]);

  if (status === "loading") {
    return <DashboardLoadingState />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (session?.user.role === "PARENT") {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Student Dashboard</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
              Keep the whole workbook moving.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
              Check your latest score signals, jump into the next practice block, and keep review momentum visible without leaving the dashboard.
            </p>
          </div>
        </section>

        <div className="space-y-8">
          <StudentDashboardQuickActions />
          {loading ? <UserStatsPanelSkeleton /> : <UserStatsPanel userStats={userStats} userResults={userResults} />}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
            {loading ? <LeaderboardTableSkeleton /> : <LeaderboardTable leaderboard={leaderboard} />}
            <RecentResultsList results={userResults} />
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Student Dashboard</div>
            <div className="mt-4 h-12 w-4/5 animate-pulse rounded-md bg-slate-200" />
            <div className="mt-3 h-6 w-3/5 animate-pulse rounded-md bg-slate-100" />
          </div>
        </section>

        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="workbook-panel h-44 animate-pulse bg-surface-white" />
            ))}
          </div>
          <UserStatsPanelSkeleton />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
            <LeaderboardTableSkeleton />
            <div className="workbook-panel h-96 animate-pulse bg-surface-white" />
          </div>
        </div>
      </main>
    </div>
  );
}
