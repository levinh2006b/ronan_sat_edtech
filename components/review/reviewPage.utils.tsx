import { BookOpen, Calculator } from "lucide-react";

import { isVerbalSection, normalizeSectionName } from "@/lib/sections";
import type { ReviewAnswer, ReviewResult, ReviewStats } from "@/types/review";

export function isReviewAnswerOmitted(answer: ReviewAnswer) {
  return !answer.userAnswer || answer.userAnswer === "" || answer.userAnswer === "Omitted";
}

export function getReviewAnswerOutcome(answer: ReviewAnswer) {
  if (isReviewAnswerOmitted(answer)) {
    return "omitted" as const;
  }

  return answer.isCorrect ? ("correct" as const) : ("wrong" as const);
}

export function getReviewStats(answers: ReviewAnswer[]): ReviewStats {
  if (!answers?.length) {
    return { correct: 0, wrong: 0, omitted: 0 };
  }

  const omitted = answers.filter((answer) => isReviewAnswerOmitted(answer)).length;
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

  const rawScore = result.totalScore ?? result.score ?? 0;
  return Math.max(400, rawScore);
}

export function groupFullLengthAnswers(result: ReviewResult) {
  return {
    rwModule1:
      result.answers?.filter(
        (answer) => isVerbalSection(answer.questionId?.section) && answer.questionId?.module === 1,
      ) || [],
    rwModule2:
      result.answers?.filter(
        (answer) => isVerbalSection(answer.questionId?.section) && answer.questionId?.module === 2,
      ) || [],
    mathModule1: result.answers?.filter((answer) => answer.questionId?.section === "Math" && answer.questionId?.module === 1) || [],
    mathModule2: result.answers?.filter((answer) => answer.questionId?.section === "Math" && answer.questionId?.module === 2) || [],
  };
}

export type SkillStat = {
  name: string;
  wrong: number;
  correct: number;
  omitted: number;
  total: number;
};

export type DomainStat = {
  domain: string;
  skills: SkillStat[];
};

export type SectionSkillStat = {
  section: string;
  domains: DomainStat[];
};

export function getSkillPerformance(answers: ReviewAnswer[]): SectionSkillStat[] {
  const sectionMap: Record<string, Record<string, Record<string, SkillStat>>> = {};

  answers.forEach((answer) => {
    const q = answer.questionId;
    if (!q) return;

    const section = normalizeSectionName(q.section) || "Uncategorized";
    const domain = q.domain || q.subject || "Uncategorized";
    const skill = q.skill || "General";

    if (!sectionMap[section]) sectionMap[section] = {};
    if (!sectionMap[section][domain]) sectionMap[section][domain] = {};
    if (!sectionMap[section][domain][skill]) {
      sectionMap[section][domain][skill] = { name: skill, wrong: 0, correct: 0, omitted: 0, total: 0 };
    }

    const stat = sectionMap[section][domain][skill];
    stat.total += 1;

    const isOmitted = isReviewAnswerOmitted(answer);
    if (isOmitted) {
      stat.omitted += 1;
    } else if (answer.isCorrect) {
      stat.correct += 1;
    } else {
      stat.wrong += 1;
    }
  });

  return Object.keys(sectionMap)
    .sort((a, b) => {
      if (isVerbalSection(a)) return -1;
      if (isVerbalSection(b)) return 1;
      return a.localeCompare(b);
    })
    .map((section) => {
      const domains = Object.keys(sectionMap[section])
        .filter((d) => d !== "Uncategorized" || Object.keys(sectionMap[section][d]).length > 0)
        .map((domain) => {
          const skills = Object.values(sectionMap[section][domain]).sort((a, b) => b.total - a.total);
          return { domain, skills };
        });
      return { section, domains };
    });
}
