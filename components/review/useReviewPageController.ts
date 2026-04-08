"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchQuestionExplanation, fetchReviewResults } from "@/lib/services/reviewService";
import type { ReviewAnswer, ReviewResult } from "@/types/review";
import { filterReviewResultsByType } from "@/components/review/reviewPage.utils";

const REVIEW_RESULTS_CACHE_KEY = "review:results";

export function useReviewPageController() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode");
  const urlTestId = searchParams.get("testId");
  const initialResultsCacheRef = useRef<ReviewResult[]>([]);
  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testType, setTestType] = useState<"full" | "sectional">(urlMode === "sectional" ? "sectional" : "full");
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [isManuallySelected, setIsManuallySelected] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    answer: ReviewAnswer;
    questionNumber: number;
    testId?: string;
  } | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const cachedResults = getClientCache<ReviewResult[]>(REVIEW_RESULTS_CACHE_KEY) ?? [];
    initialResultsCacheRef.current = cachedResults;

    if (cachedResults.length > 0) {
      setResults(cachedResults);
      setLoading(false);
    }

    setHasHydratedClientCache(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedClientCache) {
      return;
    }

    if (status === "unauthenticated") {
      window.location.href = "/auth";
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const loadResults = async () => {
      if (initialResultsCacheRef.current.length > 0) {
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await fetchReviewResults();
        if (cancelled) {
          return;
        }

        setResults(data);
        setClientCache(REVIEW_RESULTS_CACHE_KEY, data);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedClientCache, status]);

  const filteredResults = useMemo(() => filterReviewResultsByType(results, testType), [results, testType]);

  useEffect(() => {
    if (results.length === 0) {
      setActiveTestId(null);
      return;
    }

    const isValidActiveTest = activeTestId ? filteredResults.some((result) => result._id === activeTestId) : false;

    if (isManuallySelected && isValidActiveTest) {
      return;
    }

    if (urlTestId && !isManuallySelected) {
      const matchForUrl = filteredResults.find((r) => {
        const tId = typeof r.testId === "object" ? r.testId?._id : r.testId;
        return tId === urlTestId;
      });
      if (matchForUrl) {
        if (activeTestId !== matchForUrl._id) {
          setActiveTestId(matchForUrl._id);
        }
        return;
      }
    }

    if (!isValidActiveTest && filteredResults.length > 0) {
      setActiveTestId(filteredResults[0]._id);
    } else if (filteredResults.length === 0) {
      setActiveTestId(null);
    }
  }, [activeTestId, filteredResults, results.length, urlTestId, isManuallySelected]);

  const activeTest = useMemo(
    () => filteredResults.find((result) => result._id === activeTestId) || filteredResults[0],
    [activeTestId, filteredResults],
  );

  const handleExpandExplanation = async (questionId: string) => {
    if (expandedExplanations[questionId]) {
      return;
    }

    setLoadingExplanations((previous) => ({ ...previous, [questionId]: true }));
    try {
      const explanation = await fetchQuestionExplanation(questionId);
      if (explanation) {
        setExpandedExplanations((previous) => ({ ...previous, [questionId]: explanation }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingExplanations((previous) => ({ ...previous, [questionId]: false }));
    }
  };

  return {
    status,
    results,
    loading,
    refreshing,
    testType,
    activeTestId,
    selectedAnswer,
    expandedExplanations,
    loadingExplanations,
    filteredResults,
    activeTest,
    setTestType,
    setActiveTestId: (id: string | null) => {
      setIsManuallySelected(true);
      setActiveTestId(id);
    },
    setSelectedAnswer,
    handleExpandExplanation,
  };
}
