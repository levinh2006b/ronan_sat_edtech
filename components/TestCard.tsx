import Link from "next/link";
import { Clock, GraduationCap } from "lucide-react";

import DownloadPdfButton from "@/components/DownloadPdfButton";
import type { TestListItem, UserResultSummary } from "@/types/testLibrary";

interface TestCardProps {
  test: TestListItem;
  isSectional?: boolean;
  subjectFilter?: string;
  userResults?: UserResultSummary[];
}

export default function TestCard({
  test,
  isSectional = false,
  subjectFilter,
  userResults = [],
}: TestCardProps) {
  const formattedSectionName = subjectFilter === "reading" ? "Reading and Writing" : "Math";

  const rw1Count = test.questionCounts?.rw_1 || 0;
  const rw2Count = test.questionCounts?.rw_2 || 0;
  const math1Count = test.questionCounts?.math_1 || 0;
  const math2Count = test.questionCounts?.math_2 || 0;

  let totalQuestions = 0;
  let totalTime = 0;

  if (isSectional) {
    if (subjectFilter === "reading") {
      if (rw1Count > 0) {
        totalQuestions += 27;
        totalTime += 32;
      }
      if (rw2Count > 0) {
        totalQuestions += 27;
        totalTime += 32;
      }
    } else if (subjectFilter === "math") {
      if (math1Count > 0) {
        totalQuestions += 22;
        totalTime += 35;
      }
      if (math2Count > 0) {
        totalQuestions += 22;
        totalTime += 35;
      }
    }
  } else {
    if (rw1Count > 0) {
      totalQuestions += 27;
      totalTime += 32;
    }
    if (rw2Count > 0) {
      totalQuestions += 27;
      totalTime += 32;
    }
    if (math1Count > 0) {
      totalQuestions += 22;
      totalTime += 35;
    }
    if (math2Count > 0) {
      totalQuestions += 22;
      totalTime += 35;
    }
  }

  const secPrefix = subjectFilter === "reading" ? "rw" : "math";
  const mod1Count = test.questionCounts?.[`${secPrefix}_1` as keyof NonNullable<TestListItem["questionCounts"]>] || 0;
  const mod2Count = test.questionCounts?.[`${secPrefix}_2` as keyof NonNullable<TestListItem["questionCounts"]>] || 0;

  if (isSectional && mod1Count === 0 && mod2Count === 0) {
    return null;
  }

  const getModuleResult = (moduleNumber: number) =>
    userResults.find(
      (result) =>
        result.testId === test._id &&
        result.sectionalSubject === formattedSectionName &&
        result.sectionalModule === moduleNumber
    );

  const mod1Result = isSectional ? getModuleResult(1) : null;
  const mod2Result = isSectional ? getModuleResult(2) : null;

  const getScore = (result: UserResultSummary | null) => {
    if (result?.answers) {
      return result.answers.filter((answer) => answer.isCorrect).length;
    }

    return result?.score || 0;
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-blue-200">
      <div className="flex-1 p-5">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{test.title}</h3>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>{totalTime} Minutes Total</span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-slate-400" />
            <span>{totalQuestions} Questions</span>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-100 bg-slate-50 p-4">
        {isSectional ? (
          <div className="flex flex-col gap-3">
            <div className="group/btn relative">
              {mod1Result && mod1Count > 0 && (
                <div className="absolute -top-3 left-1/2 z-10 w-max -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-600 bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  Previous Result: {getScore(mod1Result)} / {subjectFilter === "reading" ? 27 : 22}
                </div>
              )}

              {mod1Count === 0 ? (
                <button
                  title="Coming Soon"
                  disabled
                  className="block w-full cursor-not-allowed rounded-lg border bg-slate-200 px-4 py-2.5 text-center font-medium text-slate-400 opacity-50 transition-all"
                >
                  Module 1 (Coming Soon)
                </button>
              ) : (
                <Link
                  href={`/test/${test._id}?section=${formattedSectionName}&module=1&mode=sectional`}
                  className={`relative block w-full rounded-lg border px-4 py-2.5 text-center font-medium transition-all ${
                    mod1Result
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                      : "border-transparent bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                  }`}
                >
                  {mod1Result ? "Retake Module 1" : "Start Module 1"}
                </Link>
              )}
            </div>

            <div className="group/btn relative mt-2">
              {mod2Result && mod2Count > 0 && (
                <div className="absolute -top-3 left-1/2 z-10 w-max -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-600 bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  Previous Result: {getScore(mod2Result)} / {subjectFilter === "reading" ? 27 : 22}
                </div>
              )}

              {mod2Count === 0 ? (
                <button
                  title="Coming Soon"
                  disabled
                  className="block w-full cursor-not-allowed rounded-lg border bg-slate-200 px-4 py-2.5 text-center font-medium text-slate-400 opacity-50 transition-all"
                >
                  Module 2 (Coming Soon)
                </button>
              ) : (
                <Link
                  href={`/test/${test._id}?section=${formattedSectionName}&module=2&mode=sectional`}
                  className={`relative block w-full rounded-lg border px-4 py-2.5 text-center font-medium transition-all ${
                    mod2Result
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                      : "border-transparent bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                  }`}
                >
                  {mod2Result ? "Retake Module 2" : "Start Module 2"}
                </Link>
              )}
            </div>

            <DownloadPdfButton
              testId={test._id}
              testName={test.title}
              sectionName={formattedSectionName}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href={`/test/${test._id}?mode=full`}
              className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
            >
              Start Practice
            </Link>
            <DownloadPdfButton testId={test._id} testName={test.title} />
          </div>
        )}
      </div>
    </div>
  );
}
