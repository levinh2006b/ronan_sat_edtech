"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { deleteClientCache } from "@/lib/clientCache";
import { DASHBOARD_CACHE_KEYS } from "@/lib/dashboardCache";
import { REVIEW_RESULTS_CACHE_KEY } from "@/lib/services/reviewService";
import { preloadPostSubmitStudentData } from "@/lib/startupPreload";
import type { QuestionExtra } from "@/lib/questionExtra";
import { normalizeSectionName, VERBAL_SECTION } from "@/lib/sections";
import { checkIsCorrect } from "@/utils/gradingHelper";
import { useTimer } from "./useTimer";

type TestQuestion = {
  _id: string;
  section: string;
  module: number;
  points?: number;
  correctAnswer?: string;
  questionType?: string;
  sprAnswers?: string[];
  questionText?: string;
  passage?: string;
  choices?: string[];
  extra?: QuestionExtra | null;
};

export const testStages = [
  { section: VERBAL_SECTION, module: 1, duration: 32 * 60 },
  { section: VERBAL_SECTION, module: 2, duration: 32 * 60 },
  { section: "Math", module: 1, duration: 35 * 60 },
  { section: "Math", module: 2, duration: 35 * 60 },
];

function clearDashboardCaches() {
  const cacheKeys = [
    DASHBOARD_CACHE_KEYS.overview,
    DASHBOARD_CACHE_KEYS.userResults,
    DASHBOARD_CACHE_KEYS.apiOverview,
    DASHBOARD_CACHE_KEYS.apiUserResults,
    `${DASHBOARD_CACHE_KEYS.apiUserResults}:30`,
    REVIEW_RESULTS_CACHE_KEY,
  ];

  cacheKeys.forEach((key) => deleteClientCache(key));
}

function getAnsweredQuestionCount(questions: TestQuestion[], answers: Record<string, string>) {
  return questions.filter((question) => {
    const answer = answers[question._id];
    return Boolean(answer && answer !== "Omitted");
  }).length;
}

function getMinimumRequiredAnswers(totalQuestions: number) {
  return Math.ceil(totalQuestions * 0.75);
}

export function useTestEngine(testId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "full";
  const targetSection = normalizeSectionName(searchParams.get("section"));
  const targetModule = searchParams.get("module") ? parseInt(searchParams.get("module") as string, 10) : null;

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerTimestamps, setAnswerTimestamps] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const isSubmittingRef = useRef(false);

  const availableModules = testStages
    .map((stage, index) => ({
      ...stage,
      originalIndex: index,
    }))
    .filter((stage) => questions.some((question) => question.section === stage.section && question.module === stage.module));

  const currentStage = testStages[currentStageIndex];
  const currentModuleQuestions = questions.filter(
    (question) => question.section === currentStage.section && question.module === currentStage.module
  );
  const answeredCurrentModuleQuestions = getAnsweredQuestionCount(currentModuleQuestions, answers);
  const minimumRequiredCurrentModuleAnswers = getMinimumRequiredAnswers(currentModuleQuestions.length);

  const { timeRemaining, setTimeRemaining, isTimerHidden, setIsTimerHidden } = useTimer(
    0,
    loading || isSubmitting,
    () => handleSubmit({ trigger: "timer" })
  );

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await api.get(API_PATHS.getQuestionsByTestId(testId), {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        const fetchedQuestions = (res.data.questions || []).map((question: TestQuestion) => ({
          ...question,
          section: normalizeSectionName(question.section),
        }));
        setQuestions(fetchedQuestions);
        setCurrentIndex(0);
        setAnswers({});
        setAnswerTimestamps({});
        setFlagged({});

        const validStages = testStages
          .map((stage, index) => ({ ...stage, originalIndex: index }))
          .filter((stage) =>
            fetchedQuestions.some(
              (question: TestQuestion) => question.section === stage.section && question.module === stage.module
            )
          );

        if (validStages.length > 0) {
          let startIndex = validStages[0].originalIndex;

          if (mode === "sectional" && targetSection && targetModule) {
            const found = validStages.find((stage) => stage.section === targetSection && stage.module === targetModule);
            if (found) {
              startIndex = found.originalIndex;
            }
          }

          setCurrentStageIndex(startIndex);
          setTimeRemaining(testStages[startIndex].duration);
        } else {
          setCurrentStageIndex(0);
          setTimeRemaining(0);
        }

        sessionStorage.setItem("testName", "Practice Test");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [mode, targetModule, targetSection, testId, setTimeRemaining]);

  const handleAnswerSelect = (questionId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
    if (!choice || choice === "Omitted") {
      return;
    }

    setAnswerTimestamps((prev) => ({ ...prev, [questionId]: new Date().toISOString() }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleNext = () => {
    if (currentIndex < currentModuleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJump = (index: number) => {
    setCurrentIndex(index);
  };

  const handleSubmit = async (options?: { bypassCompletionGate?: boolean; trigger?: "manual" | "timer" }) => {
    if (isSubmittingRef.current) {
      return;
    }

    if (!options?.bypassCompletionGate && answeredCurrentModuleQuestions < minimumRequiredCurrentModuleAnswers) {
      if (options?.trigger === "timer") {
        setIsDiscardDialogOpen(true);
        return;
      }

      window.alert(
        `You need to answer at least ${minimumRequiredCurrentModuleAnswers} of ${currentModuleQuestions.length} questions in this module before you can continue.`
      );
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const nextStage = availableModules.find((stage) => stage.originalIndex > currentStageIndex);

    if (mode === "full" && nextStage) {
      setCurrentStageIndex(nextStage.originalIndex);
      setCurrentIndex(0);
      setTimeRemaining(testStages[nextStage.originalIndex].duration);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const questionsToGrade = mode === "sectional" ? currentModuleQuestions : questions;
      const submissionTimestamp = new Date().toISOString();
      const formattedAnswers = questionsToGrade.map((question) => {
        const userAnswer = answers[question._id] || "Omitted";
        return {
          questionId: question._id,
          userAnswer,
          answeredAt: userAnswer === "Omitted" ? submissionTimestamp : answerTimestamps[question._id] ?? submissionTimestamp,
          isCorrect: checkIsCorrect(question, userAnswer),
        };
      });

      if (mode === "sectional") {
        let correctCount = 0;

        currentModuleQuestions.forEach((question) => {
          const userAnswer = answers[question._id] || "";
          if (checkIsCorrect(question, userAnswer)) {
            correctCount += 1;
          }
        });

        const res = await api.post(API_PATHS.RESULTS, {
          testId,
          isSectional: true,
          sectionalSubject: currentStage.section,
          sectionalModule: currentStage.module,
          answers: formattedAnswers,
          totalScore: correctCount,
          readingScore: 0,
          mathScore: 0,
        });

        if (res.status === 200 || res.status === 201) {
          clearDashboardCaches();
          await preloadPostSubmitStudentData();
          router.refresh();
          router.push(`/review?testId=${testId}&mode=sectional`);
        }
      } else {
        let earnedReadingPoints = 0;
        let earnedMathPoints = 0;

        questions.forEach((question) => {
          const userAnswer = answers[question._id] || "";
          if (!checkIsCorrect(question, userAnswer)) {
            return;
          }

          const points = question.points || 0;
          if (question.section === VERBAL_SECTION) {
            earnedReadingPoints += points;
          } else if (question.section === "Math") {
            earnedMathPoints += points;
          }
        });

        const readingScore = Math.min(200 + earnedReadingPoints, 800);
        const mathScore = Math.min(200 + earnedMathPoints, 800);
        const totalScore = readingScore + mathScore;

        const res = await api.post(API_PATHS.RESULTS, {
          testId,
          isSectional: false,
          answers: formattedAnswers,
          score: totalScore,
          sectionBreakdown: { readingAndWriting: readingScore, math: mathScore },
        });

        if (res.status === 200 || res.status === 201) {
          clearDashboardCaches();
          await preloadPostSubmitStudentData();
          router.refresh();
          router.push(`/review?testId=${testId}&mode=full`);
        }
      }
    } catch (error) {
      console.error(error);
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Failed to submit test";
      alert(message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const currentQuestion = currentModuleQuestions[currentIndex] || questions[0];

  return {
    mode,
    loading,
    questions,
    currentQuestion,
    currentModuleQuestions,
    currentIndex,
    answers,
    flagged,
    timeRemaining,
    isTimerHidden,
    setIsTimerHidden,
    isCalculatorOpen,
    setIsCalculatorOpen,
    currentStage,
    currentStageIndex,
    isSubmitting,
    availableModules,
    answeredCurrentModuleQuestions,
    minimumRequiredCurrentModuleAnswers,
    isDiscardDialogOpen,
    setIsDiscardDialogOpen,
    handleAnswerSelect,
    toggleFlag,
    handleNext,
    handlePrev,
    handleJump,
    handleSubmit,
    router,
  };
}
