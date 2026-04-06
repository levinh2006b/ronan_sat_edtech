"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchDashboardUserResults } from "@/lib/services/dashboardService";
import {
  fetchTestsPage,
  filterSectionalTestsBySubject,
  filterTestsByPeriod,
  getTestsClientCacheKey,
  getUniqueTestPeriods,
} from "@/lib/services/testLibraryService";
import type { CachedTestsPayload, SortOption, TestListItem, UserResultSummary } from "@/types/testLibrary";

export function useSectionalTestsController() {
  const { data: session, status } = useSession();
  const limit = 6;
  const initialTestsCacheRef = useRef<CachedTestsPayload | undefined>(undefined);
  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testsRefreshing, setTestsRefreshing] = useState(false);
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState<"reading" | "math">("reading");

  const hasCachedSectionalView = hasHydratedClientCache && Boolean(initialTestsCacheRef.current);

  useEffect(() => {
    const cachedTests = getClientCache<CachedTestsPayload>(getTestsClientCacheKey(1, limit, "newest"));
    initialTestsCacheRef.current = cachedTests;

    if (cachedTests) {
      setTests(cachedTests.tests);
      setTotalPages(cachedTests.totalPages);
      setLoading(false);
    }

    setHasHydratedClientCache(true);
  }, [limit]);

  useEffect(() => {
    setSelectedPeriod("All");
    setPage(1);
  }, [subjectFilter]);

  const testsWithSubject = useMemo(
    () => filterSectionalTestsBySubject(tests, subjectFilter),
    [subjectFilter, tests],
  );
  const uniquePeriods = useMemo(() => getUniqueTestPeriods(testsWithSubject), [testsWithSubject]);
  const filteredTests = useMemo(
    () => filterTestsByPeriod(testsWithSubject, selectedPeriod),
    [selectedPeriod, testsWithSubject],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    const loadUserResults = async () => {
      try {
        const nextResults = await fetchDashboardUserResults(365);
        setUserResults(nextResults);
      } catch (error) {
        console.error("Failed to load results", error);
      }
    };

    void loadUserResults();
  }, [session]);

  useEffect(() => {
    if (!hasHydratedClientCache) {
      return;
    }

    let cancelled = false;

    const loadTests = async () => {
      const cacheKey = getTestsClientCacheKey(page, limit, sortOption);
      const cachedTests = getClientCache<CachedTestsPayload>(cacheKey);

      if (cachedTests) {
        setTests(cachedTests.tests);
        setTotalPages(cachedTests.totalPages);
        setLoading(false);
        setTestsRefreshing(true);
      } else {
        setLoading(true);
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
          setLoading(false);
          setTestsRefreshing(false);
        }
      }
    };

    void loadTests();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedClientCache, limit, page, sortOption]);

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
    subjectFilter,
    uniquePeriods,
    filteredTests,
    setSortOption,
    setPage,
    setSelectedPeriod,
    setSubjectFilter,
  };
}
