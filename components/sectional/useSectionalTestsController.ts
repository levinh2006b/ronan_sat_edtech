"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/client";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { getCachedDashboardUserResults } from "@/lib/dashboardCache";
import { preloadDashboardUserResults, preloadInitialAppData } from "@/lib/startupPreload";
import {
  fetchTestsPage,
  getTestsClientCacheKey,
} from "@/lib/services/testLibraryService";
import type { CachedTestsPayload, SortOption, TestListItem, UserResultSummary } from "@/types/testLibrary";

export function useSectionalTestsController() {
  const { data: session, status } = useSession();
  const pageSize = 15;
  const initialTestsCacheRef = useRef<CachedTestsPayload | undefined>(undefined);
  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [uniquePeriods, setUniquePeriods] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [testsRefreshing, setTestsRefreshing] = useState(false);
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [moduleFilter, setModuleFilter] = useState<"reading" | "math">("reading");
  const [totalPages, setTotalPages] = useState(1);

  const hasCachedSectionalView = hasHydratedClientCache && Boolean(initialTestsCacheRef.current);

  useEffect(() => {
    const cachedTests = getClientCache<CachedTestsPayload>(
      getTestsClientCacheKey(1, pageSize, "newest", {
        selectedPeriod: "All",
        subject: "reading",
      }),
    );
    initialTestsCacheRef.current = cachedTests;

    if (cachedTests) {
      setTests(cachedTests.tests);
      setUniquePeriods(cachedTests.availablePeriods);
      setTotalPages(cachedTests.totalPages);
      setLoading(false);
    }

    setHasHydratedClientCache(true);
  }, [pageSize]);

  useEffect(() => {
    setSelectedPeriod("All");
    setPage(1);
  }, [moduleFilter]);

  useEffect(() => {
    if (!session) {
      return;
    }

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
          console.error("Failed to load results", error);
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
    if (!hasHydratedClientCache) {
      return;
    }

    if (status === "loading") {
      return;
    }

    if (!session?.user?.id) {
      setLoading(false);
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

      const filters = {
        selectedPeriod,
        subject: moduleFilter,
      } as const;
      const cacheKey = getTestsClientCacheKey(page, pageSize, sortOption, filters);
      const cachedTests = getClientCache<CachedTestsPayload>(cacheKey);

      if (cachedTests) {
        setTests(cachedTests.tests);
        setUniquePeriods(cachedTests.availablePeriods);
        setTotalPages(cachedTests.totalPages);
        setLoading(false);
        setTestsRefreshing(true);
      } else {
        setLoading(true);
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
          setLoading(false);
          setTestsRefreshing(false);
        }
      }
    };

    void loadTests();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedClientCache, moduleFilter, page, pageSize, selectedPeriod, session?.user?.id, session?.user?.role, sortOption, status]);

  return {
    status,
    hasCachedSectionalView,
    loading,
    testsRefreshing,
    userResults,
    sortOption,
    page,
    totalPages,
    selectedPeriod,
    moduleFilter,
    uniquePeriods,
    filteredTests: tests,
    setSortOption,
    setPage,
    setSelectedPeriod,
    setModuleFilter,
  };
}
