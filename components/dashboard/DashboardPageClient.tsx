"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import LeaderboardTableSkeleton from "@/components/dashboard/LeaderboardTableSkeleton";
import ImprovementTrendPanel from "@/components/dashboard/ImprovementTrendPanel";
import RecentResultsList from "@/components/dashboard/RecentResultsList";
import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import UserStatsPanelSkeleton from "@/components/dashboard/UserStatsPanelSkeleton";
import { fetchDashboardUserResults, fetchDashboardUserStats, fetchLeaderboard } from "@/lib/services/dashboardService";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { preloadInitialAppData } from "@/lib/startupPreload";
import type { LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

const CACHE_STATS = "dashboard:stats";
const CACHE_RESULTS = "dashboard:results:30";
const CACHE_LEADERBOARD = "dashboard:leaderboard";
const API_CACHE_STATS = "api:dashboard:stats";
const API_CACHE_RESULTS = "api:dashboard:results:30";
const API_CACHE_LEADERBOARD = "api:dashboard:leaderboard";

export default function DashboardPageClient() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [userStats, setUserStats] = useState<UserStatsSummary>({ testsTaken: 0, highestScore: 0 });
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);

  useLayoutEffect(() => {
    const cachedStats = getClientCache<UserStatsSummary>(CACHE_STATS) ?? getClientCache<UserStatsSummary>(API_CACHE_STATS);
    const cachedResults =
      getClientCache<UserResultSummary[]>(CACHE_RESULTS) ?? getClientCache<UserResultSummary[]>(API_CACHE_RESULTS);
    const cachedLeaderboard =
      getClientCache<LeaderboardEntry[]>(CACHE_LEADERBOARD) ?? getClientCache<LeaderboardEntry[]>(API_CACHE_LEADERBOARD);

    if (cachedStats !== undefined && cachedResults !== undefined && cachedLeaderboard !== undefined) {
      setUserStats(cachedStats);
      setUserResults(cachedResults);
      setLeaderboard(cachedLeaderboard);
      setLoading(false);
    }

    setHasHydratedClientCache(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedClientCache) {
      return;
    }

    if (status === "unauthenticated") {
      router.replace("/auth");
      return;
    }

    if (status !== "authenticated" || !session?.user?.role) {
      return;
    }

    if (session.user.role === "PARENT") {
      router.replace("/parent/dashboard");
      return;
    }

    if (!session.user.hasCompletedProfile) {
      router.replace("/welcome");
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      const cachedStats = getClientCache<UserStatsSummary>(CACHE_STATS) ?? getClientCache<UserStatsSummary>(API_CACHE_STATS);
      const cachedResults =
        getClientCache<UserResultSummary[]>(CACHE_RESULTS) ?? getClientCache<UserResultSummary[]>(API_CACHE_RESULTS);
      const cachedLeaderboard =
        getClientCache<LeaderboardEntry[]>(CACHE_LEADERBOARD) ?? getClientCache<LeaderboardEntry[]>(API_CACHE_LEADERBOARD);
      const hasCachedDashboardData =
        cachedStats !== undefined && cachedResults !== undefined && cachedLeaderboard !== undefined;

      if (hasCachedDashboardData) {
        setUserStats(cachedStats);
        setUserResults(cachedResults);
        setLeaderboard(cachedLeaderboard);
        setLoading(false);
      } else {
        setLoading(true);
      }

      await preloadInitialAppData({
        role: session.user.role,
        userId: session.user.id,
      });

      if (cancelled) {
        return;
      }

      const warmedStats = getClientCache<UserStatsSummary>(CACHE_STATS) ?? getClientCache<UserStatsSummary>(API_CACHE_STATS);
      const warmedResults =
        getClientCache<UserResultSummary[]>(CACHE_RESULTS) ?? getClientCache<UserResultSummary[]>(API_CACHE_RESULTS);
      const warmedLeaderboard =
        getClientCache<LeaderboardEntry[]>(CACHE_LEADERBOARD) ?? getClientCache<LeaderboardEntry[]>(API_CACHE_LEADERBOARD);

      if (warmedStats !== undefined && warmedResults !== undefined && warmedLeaderboard !== undefined) {
        if (!cancelled) {
          setClientCache(CACHE_STATS, warmedStats);
          setClientCache(CACHE_RESULTS, warmedResults);
          setClientCache(CACHE_LEADERBOARD, warmedLeaderboard);
          setUserStats(warmedStats);
          setUserResults(warmedResults);
          setLeaderboard(warmedLeaderboard);
          setLoading(false);
        }
        return;
      }

      try {
        const [stats, results, board] = await Promise.all([
          fetchDashboardUserStats(),
          fetchDashboardUserResults(30),
          fetchLeaderboard(),
        ]);

        if (cancelled) {
          return;
        }

        setClientCache(CACHE_STATS, stats);
        setClientCache(CACHE_RESULTS, results);
        setClientCache(CACHE_LEADERBOARD, board);

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
  }, [hasHydratedClientCache, router, session?.user?.hasCompletedProfile, session?.user?.role, status]);

  if (status === "loading" || loading) {
    return <DashboardPageSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!session?.user?.hasCompletedProfile) {
    return null;
  }

  if (session?.user.role === "PARENT") {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <InitialTabBootReady />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Student Dashboard</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
              Keep the whole workbook moving.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
              Check your latest score signals and keep review momentum visible without leaving the dashboard.
            </p>
          </div>
        </section>

        <div className="space-y-8">
          <UserStatsPanel userStats={userStats} userResults={userResults} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            <ImprovementTrendPanel results={userResults} />
            <RecentResultsList results={userResults} />
          </div>
          <LeaderboardTable leaderboard={leaderboard} />
        </div>
      </main>
    </div>
  );
}

function DashboardPageSkeleton() {
  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <InitialTabBootReady />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="h-8 w-40 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
            <div className="mt-4 h-12 w-full max-w-2xl rounded-md bg-surface-white/75 animate-pulse" />
            <div className="mt-3 h-6 w-full max-w-xl rounded-md bg-surface-white animate-pulse" />
          </div>
        </section>

        <div className="space-y-8">
          <UserStatsPanelSkeleton />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            {Array.from({ length: 2 }).map((_, index) => (
              <section key={index} className="workbook-panel overflow-hidden">
                <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
                  <div className="h-8 w-48 rounded-md bg-surface-white/75 animate-pulse" />
                  <div className="mt-3 h-5 w-32 rounded bg-surface-white animate-pulse" />
                </div>
                <div className="space-y-4 p-6">
                  {Array.from({ length: index === 0 ? 5 : 4 }).map((__, rowIndex) => (
                    <div key={rowIndex} className="h-14 rounded-2xl border-2 border-ink-fg bg-paper-bg animate-pulse" />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <LeaderboardTableSkeleton />
        </div>
      </main>
    </div>
  );
}
