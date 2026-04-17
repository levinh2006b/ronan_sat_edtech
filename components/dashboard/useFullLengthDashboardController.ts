"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchDashboardUserResults } from "@/lib/services/dashboardService";
import {
  fetchTestsPage,
  getTestsClientCacheKey,
} from "@/lib/services/testLibraryService";
import type {
  CachedTestsPayload,
  SortOption,
  TestListItem,
  UserResultSummary,
} from "@/types/testLibrary";

export function useFullLengthDashboardController() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pageSize = 15;
  const initialTestsCacheRef = useRef<CachedTestsPayload | undefined>(undefined);
  const initialTestsCache = initialTestsCacheRef.current;

  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [uniquePeriods, setUniquePeriods] = useState<string[]>(["All"]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsRefreshing, setTestsRefreshing] = useState(false);
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [totalPages, setTotalPages] = useState(1);

  const hasCachedDashboardView = hasHydratedClientCache && Boolean(initialTestsCache);

  useEffect(() => {
    const testsCache = getClientCache<CachedTestsPayload>(
      getTestsClientCacheKey(1, pageSize, "newest", { selectedPeriod: "All" }),
    );

    initialTestsCacheRef.current = testsCache;

    if (testsCache) {
      setTests(testsCache.tests);
      setUniquePeriods(testsCache.availablePeriods);
      setTotalPages(testsCache.totalPages);
      setTestsLoading(false);
    }

    setHasHydratedClientCache(true);
  }, [pageSize]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [router, status]);

  // Cache key for the current user's result history.
  const CACHE_USER_RESULTS = "dashboard:user-results";

  useEffect(() => {
    if (!session) {
      return;
    }

    // Guard against state updates after the component has unmounted.
    let cancelled = false;

    const loadUserResults = async () => {
      // --- Read-through cache: serve instantly if results are already cached ---
      const cachedResults = getClientCache<UserResultSummary[]>(CACHE_USER_RESULTS);

      if (cachedResults !== undefined) {
        // Cache hit — update state immediately without a network request.
        if (!cancelled) {
          setUserResults(cachedResults);
        }
        return;
      }

      // Cache miss — fetch fresh data and persist it for subsequent mounts.
      try {
        const nextResults = await fetchDashboardUserResults();

        if (cancelled) {
          return;
        }

        // Write to cache before updating state so future re-mounts are instant.
        setClientCache(CACHE_USER_RESULTS, nextResults);
        setUserResults(nextResults);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch user results", error);
        }
      }
    };

    void loadUserResults();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    let cancelled = false;

    const loadTests = async () => {
      const filters = { selectedPeriod } as const;
      const cacheKey = getTestsClientCacheKey(page, pageSize, sortOption, filters);
      const cachedTests = getClientCache<CachedTestsPayload>(cacheKey);

      if (cachedTests) {
        setTests(cachedTests.tests);
        setUniquePeriods(cachedTests.availablePeriods);
        setTotalPages(cachedTests.totalPages);
        setTestsLoading(false);
        setTestsRefreshing(true);
      } else {
        setTestsLoading(true);
        setTestsRefreshing(false);
      }

      try {
        const nextPayload = await fetchTestsPage(page, pageSize, sortOption, filters);

        if (cancelled) {
          return;
        }

        setTests(nextPayload.tests);
        setUniquePeriods(nextPayload.availablePeriods);
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
  }, [page, pageSize, selectedPeriod, sortOption]);

  return {
    session,
    status,
    hasCachedDashboardView,
    testsLoading,
    testsRefreshing,
    userResults,
    sortOption,
    page,
    totalPages,
    selectedPeriod,
    uniquePeriods,
    filteredTests: tests,
    setSortOption,
    setPage,
    setSelectedPeriod,
  };
}
