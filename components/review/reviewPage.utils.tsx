import { BookOpen, Calculator } from "lucide-react";

import type { ReviewAnswer, ReviewResult, ReviewStats } from "@/types/review";

export function getReviewStats(answers: ReviewAnswer[]): ReviewStats {
  if (!answers?.length) {
    return { correct: 0, wrong: 0, omitted: 0 };
  }

  const omitted = answers.filter((answer) => !answer.userAnswer || answer.userAnswer === "" || answer.userAnswer === "Omitted").length;
  const correct = answers.filter((answer) => answer.isCorrect).length;
  return { correct, wrong: answers.length - correct - omitted, omitted };
}

export function toTitleCase(value: string) {
  return value?.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) ?? "";
}

export function getSectionalColors(subject: string) {
  const normalizedSubject = subject?.toLowerCase() ?? "";
  if (normalizedSubject.includes("math")) {
    return {
      icon: "bg-blue-100",
      title: "text-blue-700",
      module: "text-blue-600",
      badge: "bg-blue-50 text-blue-600 border-blue-100",
      divider: "bg-blue-100",
    };
  }

  return {
    icon: "bg-indigo-100",
    title: "text-indigo-700",
    module: "text-indigo-600",
    badge: "bg-indigo-50 text-indigo-600 border-indigo-100",
    divider: "bg-indigo-100",
  };
}

export function getSectionalIcon(subject: string) {
  const normalizedSubject = subject?.toLowerCase() ?? "";
  if (normalizedSubject.includes("math")) {
    return <Calculator className="h-4 w-4 text-blue-600" />;
  }

  return <BookOpen className="h-4 w-4 text-indigo-600" />;
}

export function filterReviewResultsByType(results: ReviewResult[], testType: "full" | "sectional") {
  return results.filter((result) => (testType === "full" ? !result.isSectional : result.isSectional));
}

export function getReviewScoreLabel(result: ReviewResult) {
  if (result.isSectional) {
    return `${result.answers.filter((answer) => answer.isCorrect).length} / ${result.answers.length}`;
  }

  return result.score;
}

export function groupFullLengthAnswers(result: ReviewResult) {
  return {
    rwModule1:
      result.answers?.filter(
        (answer) => answer.questionId?.section === "Reading and Writing" && answer.questionId?.module === 1,
      ) || [],
    rwModule2:
      result.answers?.filter(
        (answer) => answer.questionId?.section === "Reading and Writing" && answer.questionId?.module === 2,
      ) || [],
    mathModule1: result.answers?.filter((answer) => answer.questionId?.section === "Math" && answer.questionId?.module === 1) || [],
    mathModule2: result.answers?.filter((answer) => answer.questionId?.section === "Math" && answer.questionId?.module === 2) || [],
  };
}
