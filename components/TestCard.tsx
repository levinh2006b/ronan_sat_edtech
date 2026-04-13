import type { ReactNode } from "react";
import Link from "next/link";
import { CircleHelp, Clock3, RotateCcw } from "lucide-react";

import DownloadPdfButton from "@/components/DownloadPdfButton";
import type { TestListItem, UserResultSummary } from "@/types/testLibrary";

interface TestCardProps {
  test: TestListItem;
  isSectional?: boolean;
  subjectFilter?: string;
  userResults?: UserResultSummary[];
}

type ModuleActionProps = {
  title: string;
  available: boolean;
  result: UserResultSummary | null;
  scoreDenominator: number;
  startHref: string;
  reviewHref?: string;
};

function getResultTestId(result: UserResultSummary) {
  if (typeof result.testId === "string") {
    return result.testId;
  }

  return result.testId?._id ?? "";
}

function getLatestResult(results: UserResultSummary[]) {
  return [...results].sort(
    (left, right) =>
      new Date(right.createdAt ?? right.updatedAt ?? right.date ?? 0).getTime() -
      new Date(left.createdAt ?? left.updatedAt ?? left.date ?? 0).getTime(),
  )[0] ?? null;
}

function getFullLengthScore(result: UserResultSummary | null) {
  const rawScore = result?.totalScore ?? result?.score ?? 0;
  return Math.max(400, rawScore);
}

function getSectionalScore(result: UserResultSummary | null) {
  if (!result) {
    return 0;
  }

  if (result.answers) {
    return result.answers.filter((answer) => answer.isCorrect).length;
  }

  return result.score || result.totalScore || 0;
}

export default function TestCard({
  test,
  isSectional = false,
  subjectFilter,
  userResults = [],
}: TestCardProps) {
  const formattedSectionName = subjectFilter === "reading" ? "Reading and Writing" : "Math";
  const sectionalStickerLabel = subjectFilter === "reading" ? "Verbal Drill" : "Math Drill";

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

  const latestFullLengthResult = getLatestResult(
    userResults.filter((result) => getResultTestId(result) === test._id && !result.isSectional),
  );

  const getModuleResult = (moduleNumber: number) =>
    getLatestResult(
      userResults.filter(
        (result) =>
          getResultTestId(result) === test._id &&
          result.sectionalSubject === formattedSectionName &&
          result.sectionalModule === moduleNumber,
      ),
    );

  const mod1Result = isSectional ? getModuleResult(1) : null;
  const mod2Result = isSectional ? getModuleResult(2) : null;
  const stickerClassName = isSectional ? "bg-accent-2 text-white" : "bg-primary text-ink-fg";

  return (
    <div className="workbook-panel flex h-full flex-col overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-4 py-4">
        <div className="flex min-h-[6.6rem] items-start justify-between gap-4">
          <div className="flex min-h-[5rem] min-w-0 flex-1 flex-col">
            <div className={`workbook-sticker w-fit ${stickerClassName}`}>
              {isSectional ? sectionalStickerLabel : "Full Practice"}
            </div>
            <h3
              className="mt-3.5 max-w-[13ch] overflow-hidden font-display text-[1.35rem] font-black uppercase leading-[0.96] tracking-tight md:text-[1.5rem]"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {test.title}
            </h3>
          </div>

          {!isSectional && latestFullLengthResult ? (
            <div className="rounded-2xl border-2 border-ink-fg bg-surface-white px-3 py-2.5 text-center text-ink-fg brutal-shadow-sm">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em]">Last Score</p>
              <p className="mt-1 font-display text-xl font-black md:text-2xl">{getFullLengthScore(latestFullLengthResult)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard icon={<Clock3 className="h-4 w-4" />} label="Minutes" value={String(totalTime)} />
          <StatCard icon={<CircleHelp className="h-4 w-4" />} label="Questions" value={String(totalQuestions)} />
        </div>
      </div>

      <div className="mt-auto border-t-4 border-ink-fg bg-paper-bg p-4">
        {isSectional ? (
          <div className="flex flex-col gap-3">
            <ModuleAction
              title="Module 1"
              available={mod1Count > 0}
              result={mod1Result}
              scoreDenominator={subjectFilter === "reading" ? 27 : 22}
              startHref={`/test/${test._id}?section=${formattedSectionName}&module=1&mode=sectional`}
              reviewHref={mod1Result?._id ? `/review?mode=sectional&resultId=${mod1Result._id}` : undefined}
            />
            <ModuleAction
              title="Module 2"
              available={mod2Count > 0}
              result={mod2Result}
              scoreDenominator={subjectFilter === "reading" ? 27 : 22}
              startHref={`/test/${test._id}?section=${formattedSectionName}&module=2&mode=sectional`}
              reviewHref={mod2Result?._id ? `/review?mode=sectional&resultId=${mod2Result._id}` : undefined}
            />

            <DownloadPdfButton
              testId={test._id}
              testName={test.title}
              sectionName={formattedSectionName}
              className="workbook-button workbook-button-secondary w-full justify-center"
            />
          </div>
        ) : latestFullLengthResult?._id ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_68px] gap-3">
              <Link
                href={`/review?mode=full&resultId=${latestFullLengthResult._id}`}
                className="workbook-button workbook-button-secondary justify-center"
              >
                Review
              </Link>
              <Link
                href={`/test/${test._id}?mode=full`}
                className="workbook-button workbook-button-secondary justify-center px-0"
                aria-label="Retake full-length test"
              >
                <RotateCcw className="h-4 w-4" />
              </Link>
            </div>
            <DownloadPdfButton
              testId={test._id}
              testName={test.title}
              className="workbook-button workbook-button-secondary w-full justify-center"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link href={`/test/${test._id}?mode=full`} className="workbook-button w-full justify-center">
              Start Practice
            </Link>
            <DownloadPdfButton
              testId={test._id}
              testName={test.title}
              className="workbook-button workbook-button-secondary w-full justify-center"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-3 brutal-shadow-sm">
      <div className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-ink-fg sm:text-[0.65rem]">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="mt-2.5 font-display text-[2rem] font-black leading-none tracking-tight text-ink-fg">{value}</div>
    </div>
  );
}

function ModuleAction({
  title,
  available,
  result,
  scoreDenominator,
  startHref,
  reviewHref,
}: ModuleActionProps) {
  return (
    <section className="rounded-2xl border-2 border-ink-fg bg-surface-white p-3.5 brutal-shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-fg">{title}</span>
        {result ? <span className="workbook-sticker bg-primary">{getSectionalScore(result)} / {scoreDenominator}</span> : null}
      </div>

      {!available ? (
        <button
          title="Coming soon"
          disabled
          className="w-full rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] text-ink-fg opacity-60"
        >
          Coming Soon
        </button>
      ) : result?._id && reviewHref ? (
        <div className="grid grid-cols-[minmax(0,1fr)_68px] gap-3">
          <Link href={reviewHref} className="workbook-button workbook-button-secondary justify-center">
            Review
          </Link>
          <Link href={startHref} className="workbook-button workbook-button-secondary justify-center px-0" aria-label={`Retake ${title.toLowerCase()}`}>
            <RotateCcw className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <Link href={startHref} className="workbook-button w-full justify-center">
          Start {title}
        </Link>
      )}
    </section>
  );
}
