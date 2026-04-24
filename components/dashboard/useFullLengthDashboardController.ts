"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getCachedDashboardUserResults } from "@/lib/dashboardCache";
import { preloadDashboardUserResults, preloadInitialAppData } from "@/lib/startupPreload";
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

  useEffect(() => {
    if (!session) {
      return;
    }

    // Guard against state updates after the component has unmounted.
    let cancelled = false;

    const loadUserResults = async () => {
      void preloadInitialAppData({
        role: session.user.role,
        userId: session.user.id,
      });

      const cachedResults = getCachedDashboardUserResults();

      if (cachedResults !== undefined) {
        if (!cancelled) {
          setUserResults(cachedResults);
        }
        return;
      }

      try {
        const nextResults = await preloadDashboardUserResults();

        if (cancelled) {
          return;
        }

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
    if (status === "loading") {
      return;
    }

    if (!session?.user?.id) {
      setTestsLoading(false);
      setTestsRefreshing(false);
      return;
    }

    let cancelled = false;

    const loadTests = async () => {
      await preloadInitialAppData({
        role: session.user.role,
        userId: session.user.id,
      });

      if (cancelled) {
        return;
      }

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
        const nextPayload = await fetchTestsPage(page, pageSize, sortOption, filters, {
          forceRefresh: cachedTests !== undefined,
        });

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
  }, [page, pageSize, selectedPeriod, session?.user?.id, session?.user?.role, sortOption, status]);

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
