"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchDashboardUserResults, fetchDashboardUserStats, fetchLeaderboard } from "@/lib/services/dashboardService";
import {
  fetchTestsPage,
  filterTestsByPeriod,
  getTestsClientCacheKey,
  getUniqueTestPeriods,
} from "@/lib/services/testLibraryService";
import type {
  CachedTestsPayload,
  CachedUserStatsPayload,
  LeaderboardEntry,
  SortOption,
  TestListItem,
  UserResultSummary,
  UserStatsSummary,
} from "@/types/testLibrary";

const USER_STATS_CACHE_KEY = "dashboard:user-stats";
const LEADERBOARD_CACHE_KEY = "dashboard:leaderboard";

export function useFullLengthDashboardController() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const limit = 6;
  const initialTestsCacheRef = useRef<CachedTestsPayload | undefined>(undefined);
  const initialUserStatsCacheRef = useRef<CachedUserStatsPayload | undefined>(undefined);
  const initialLeaderboardCacheRef = useRef<LeaderboardEntry[] | undefined>(undefined);
  const initialTestsCache = initialTestsCacheRef.current;
  const initialUserStatsCache = initialUserStatsCacheRef.current;
  const initialLeaderboardCache = initialLeaderboardCacheRef.current;

  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsRefreshing, setTestsRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsRefreshing, setStatsRefreshing] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardRefreshing, setLeaderboardRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStatsSummary>({ testsTaken: 0, highestScore: 0 });
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("All");

  const hasCachedDashboardView = hasHydratedClientCache && Boolean(initialTestsCache || initialUserStatsCache || initialLeaderboardCache);
  const uniquePeriods = useMemo(() => getUniqueTestPeriods(tests), [tests]);
  const filteredTests = useMemo(() => filterTestsByPeriod(tests, selectedPeriod), [selectedPeriod, tests]);

  useEffect(() => {
    const testsCache = getClientCache<CachedTestsPayload>(getTestsClientCacheKey(1, limit, "newest"));
    const userStatsCache = getClientCache<CachedUserStatsPayload>(USER_STATS_CACHE_KEY);
    const leaderboardCache = getClientCache<LeaderboardEntry[]>(LEADERBOARD_CACHE_KEY);

    initialTestsCacheRef.current = testsCache;
    initialUserStatsCacheRef.current = userStatsCache;
    initialLeaderboardCacheRef.current = leaderboardCache;

    if (testsCache) {
      setTests(testsCache.tests);
      setTotalPages(testsCache.totalPages);
      setTestsLoading(false);
    }

    if (userStatsCache) {
      setUserStats(userStatsCache.userStats);
      setUserResults(userStatsCache.userResults);
      setStatsLoading(false);
    }

    if (leaderboardCache) {
      setLeaderboard(leaderboardCache);
      setLeaderboardLoading(false);
    }

    setHasHydratedClientCache(true);
  }, [limit]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [router, status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const loadUserStats = async () => {
      if (initialUserStatsCacheRef.current) {
        setStatsRefreshing(true);
        setStatsLoading(false);
      } else {
        setStatsLoading(true);
      }

      try {
        const [nextResults, nextUserStats] = await Promise.all([
          fetchDashboardUserResults(30),
          fetchDashboardUserStats(),
        ]);

        setUserResults(nextResults);
        setUserStats(nextUserStats);
        setClientCache(USER_STATS_CACHE_KEY, {
          userStats: nextUserStats,
          userResults: nextResults,
        } satisfies CachedUserStatsPayload);
      } catch (error) {
        console.error("Failed to load user stats", error);
      } finally {
        setStatsLoading(false);
        setStatsRefreshing(false);
      }
    };

    const loadLeaderboard = async () => {
      if (initialLeaderboardCacheRef.current) {
        setLeaderboardRefreshing(true);
        setLeaderboardLoading(false);
      } else {
        setLeaderboardLoading(true);
      }

      try {
        const nextLeaderboard = await fetchLeaderboard();
        setLeaderboard(nextLeaderboard);
        setClientCache(LEADERBOARD_CACHE_KEY, nextLeaderboard);
      } catch (error) {
        console.error("Failed to load leaderboard", error);
      } finally {
        setLeaderboardLoading(false);
        setLeaderboardRefreshing(false);
      }
    };

    void loadUserStats();
    void loadLeaderboard();
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const loadTests = async () => {
      const cacheKey = getTestsClientCacheKey(page, limit, sortOption);
      const cachedTests = getClientCache<CachedTestsPayload>(cacheKey);

      if (cachedTests) {
        setTests(cachedTests.tests);
        setTotalPages(cachedTests.totalPages);
        setTestsLoading(false);
        setTestsRefreshing(true);
      } else {
        setTestsLoading(true);
        setTestsRefreshing(false);
      }

      try {
        const nextPayload = await fetchTestsPage(page, limit, sortOption);

        if (cancelled) {
          return;
        }

        setTests(nextPayload.tests);
        setTotalPages(nextPayload.totalPages);
        setClientCache(cacheKey, nextPayload);
      } catch (error) {
        console.error("Failed to fetch tests", error);
      } finally {
        if (!cancelled) {
          setTestsLoading(false);
          setTestsRefreshing(false);
        }
      }
    };

    void loadTests();

    return () => {
      cancelled = true;
    };
  }, [limit, page, sortOption]);

  return {
    session,
    status,
    hasCachedDashboardView,
    testsLoading,
    testsRefreshing,
    statsLoading,
    statsRefreshing,
    leaderboardLoading,
    leaderboardRefreshing,
    userStats,
    userResults,
    sortOption,
    page,
    totalPages,
    leaderboard,
    selectedPeriod,
    uniquePeriods,
    filteredTests,
    setSortOption,
    setPage,
    setSelectedPeriod,
  };
}
