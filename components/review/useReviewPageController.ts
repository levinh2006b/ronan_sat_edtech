"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/lib/auth/client";
import { useSearchParams } from "next/navigation";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { preloadInitialAppData } from "@/lib/startupPreload";
import {
  fetchQuestionExplanation,
  fetchReviewQuestion,
  fetchReviewResult,
  fetchReviewResults,
  REVIEW_RESULTS_CACHE_KEY,
  updateReviewAnswerReason,
} from "@/lib/services/reviewService";
import type { ReviewAnswer, ReviewResult } from "@/types/review";
import { filterReviewResultsByType } from "@/components/review/reviewPage.utils";

type UseReviewPageControllerOptions = {
  activeView?: "results" | "error-log";
};

export function useReviewPageController({ activeView = "results" }: UseReviewPageControllerOptions = {}) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode");
  const urlTestId = searchParams.get("testId");
  const urlResultId = searchParams.get("resultId");
  const initialResultsCacheRef = useRef<ReviewResult[]>([]);
  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testType, setTestType] = useState<"full" | "sectional">(urlMode === "sectional" ? "sectional" : "full");
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [isManuallySelected, setIsManuallySelected] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    resultId: string;
    answer: ReviewAnswer;
    questionNumber: number;
    testId?: string;
  } | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});
  const [loadingSelectedAnswer, setLoadingSelectedAnswer] = useState(false);

  const mergeResult = (nextResult: ReviewResult) => {
    setResults((currentResults) => {
      const mergedResults = currentResults.map((result) => (result._id === nextResult._id ? nextResult : result));
      setClientCache(REVIEW_RESULTS_CACHE_KEY, mergedResults);
      return mergedResults;
    });
  };

  const replaceAnswerInResult = (resultId: string, questionId: string, nextAnswer: ReviewAnswer) => {
    setResults((currentResults) => {
      const mergedResults = currentResults.map((result) => {
        if (result._id !== resultId) {
          return result;
        }

        return {
          ...result,
          answers: result.answers.map((currentAnswer) =>
            currentAnswer.questionId?._id === questionId ? nextAnswer : currentAnswer,
          ),
        };
      });

      setClientCache(REVIEW_RESULTS_CACHE_KEY, mergedResults);
      return mergedResults;
    });
  };

  useLayoutEffect(() => {
    if (activeView === "error-log") {
      initialResultsCacheRef.current = [];
      setResults([]);
      setLoading(false);
      setHasHydratedClientCache(true);
      return;
    }

    const cachedResults = getClientCache<ReviewResult[]>(REVIEW_RESULTS_CACHE_KEY) ?? [];
    initialResultsCacheRef.current = cachedResults;

    if (cachedResults.length > 0) {
      setResults(cachedResults);
      setLoading(false);
    }

    setHasHydratedClientCache(true);
  }, [activeView]);

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
      if (activeView === "error-log") {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (session?.user?.id) {
        await preloadInitialAppData({
          role: session.user.role,
          userId: session.user.id,
        });

        if (cancelled) {
          return;
        }
      }

      const cachedResults = getClientCache<ReviewResult[]>(REVIEW_RESULTS_CACHE_KEY) ?? [];

      if (cachedResults.length > 0) {
        initialResultsCacheRef.current = cachedResults;
        setResults(cachedResults);
        setLoading(false);
        setRefreshing(false);
        return;
      }

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
  }, [activeView, hasHydratedClientCache, session?.user?.id, session?.user?.role, status]);

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

    if (urlResultId && !isManuallySelected) {
      const matchForResult = filteredResults.find((result) => result._id === urlResultId);
      if (matchForResult) {
        if (activeTestId !== matchForResult._id) {
          setActiveTestId(matchForResult._id);
        }
        return;
      }
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
  }, [activeTestId, filteredResults, results.length, urlResultId, urlTestId, isManuallySelected]);

  const activeTest = useMemo(
    () => filteredResults.find((result) => result._id === activeTestId) || filteredResults[0],
    [activeTestId, filteredResults],
  );

  useEffect(() => {
    if (activeView !== "results" || !activeTestId) {
      return;
    }

    const currentResult = results.find((result) => result._id === activeTestId);
    if (!currentResult || currentResult.detailsLoaded) {
      return;
    }

    let cancelled = false;

    const loadResultDetails = async () => {
      setRefreshing(true);

      try {
        const detailedResult = await fetchReviewResult(activeTestId);
        if (!cancelled) {
          mergeResult(detailedResult);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
        }
      }
    };

    void loadResultDetails();

    return () => {
      cancelled = true;
    };
  }, [activeTestId, activeView, results]);

  const handleSelectAnswer = async ({
    resultId,
    answer,
    questionNumber,
    testId,
  }: {
    resultId: string;
    answer: ReviewAnswer;
    questionNumber: number;
    testId?: string;
  }) => {
    setSelectedAnswer({ resultId, answer, questionNumber, testId });

    const questionId = answer.questionId?._id;
    if (!questionId || answer.questionLoaded) {
      return;
    }

    setLoadingSelectedAnswer(true);

    try {
      const fullAnswer = await fetchReviewQuestion(resultId, questionId);

      setSelectedAnswer((current) => {
        if (!current || current.resultId !== resultId || current.answer.questionId?._id !== questionId) {
          return current;
        }

        return {
          ...current,
          answer: fullAnswer,
        };
      });

      replaceAnswerInResult(resultId, questionId, fullAnswer);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSelectedAnswer(false);
    }
  };

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

  const handleUpdateAnswerReason = async (resultId: string, questionId: string, reason?: string) => {
    const normalizedReason = reason?.trim();

    if (activeView === "error-log") {
      await updateReviewAnswerReason(resultId, questionId, normalizedReason);
      return;
    }

    const previousResults = results;
    const nextResults = results.map((result) => {
      if (result._id !== resultId) {
        return result;
      }

      return {
        ...result,
        answers: result.answers.map((answer) => {
          const currentQuestionId = answer.questionId?._id;
          if (currentQuestionId !== questionId) {
            return answer;
          }

          return {
            ...answer,
            errorReason: normalizedReason,
          };
        }),
      };
    });

    setResults(nextResults);
    setClientCache(REVIEW_RESULTS_CACHE_KEY, nextResults);
    setSelectedAnswer((current) => {
      if (!current || current.resultId !== resultId || current.answer.questionId?._id !== questionId) {
        return current;
      }

      return {
        ...current,
        answer: {
          ...current.answer,
          errorReason: normalizedReason,
        },
      };
    });

    try {
      await updateReviewAnswerReason(resultId, questionId, normalizedReason);
    } catch (error) {
      setResults(previousResults);
      setClientCache(REVIEW_RESULTS_CACHE_KEY, previousResults);
      throw error;
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
    loadingSelectedAnswer,
    setTestType,
    setActiveTestId: (id: string | null) => {
      setIsManuallySelected(true);
      setActiveTestId(id);
    },
    setSelectedAnswer,
    handleSelectAnswer,
    handleExpandExplanation,
    handleUpdateAnswerReason,
  };
}
