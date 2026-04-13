import {
  BookOpen,
  Calculator,
  CheckCircle2,
  FileText,
  MinusCircle,
  Trophy,
  XCircle,
} from "lucide-react";

import type { ReviewAnswer, ReviewResult } from "@/types/review";
import {
  getReviewStats,
  getSectionalColors,
  getSectionalIcon,
  getSkillPerformance,
  groupFullLengthAnswers,
  toTitleCase,
} from "@/components/review/reviewPage.utils";
import { SkillPerformanceCard } from "@/components/review/SkillPerformanceCard";

type ReviewReportProps = {
  testType: "full" | "sectional";
  activeTest?: ReviewResult;
  onSelectAnswer: (payload: { answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;
};

function AnswerGrid({
  answers,
  startIndex,
  testId,
  onSelectAnswer,
}: {
  answers: ReviewAnswer[];
  startIndex: number;
  testId?: string;
  onSelectAnswer: (payload: { answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;
}) {
  if (!answers || answers.length === 0) {
    return <p className="mt-2 text-sm italic text-ink-fg/60">No data for this module.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {answers.map((answer, index) => {
        const isOmitted = !answer.userAnswer || answer.userAnswer === "" || answer.userAnswer === "Omitted";
        let className = "border-2 border-ink-fg bg-surface-white text-ink-fg";

        if (!isOmitted) {
          className = answer.isCorrect
            ? "border-2 border-ink-fg bg-accent-2 text-white"
            : "border-2 border-ink-fg bg-accent-3 text-white";
        }

        return (
          <button
            key={`${answer.questionId?._id || index}-${startIndex + index}`}
            title={`Q${startIndex + index + 1} - ${isOmitted ? "Omitted" : answer.isCorrect ? "Correct" : "Incorrect"}`}
            onClick={() => onSelectAnswer({ answer, questionNumber: startIndex + index + 1, testId })}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-black transition-all duration-150 brutal-shadow-sm workbook-press ${className}`}
          >
            {startIndex + index + 1}
          </button>
        );
      })}
    </div>
  );
}

function ReviewSummaryCard({ testType, activeTest }: { testType: "full" | "sectional"; activeTest: ReviewResult }) {
  const stats = getReviewStats(activeTest.answers || []);
  const fullLengthScore = Math.max(400, activeTest.totalScore ?? activeTest.score ?? 0);

  return (
    <div className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg">{activeTest.testId?.title}</h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-ink-fg/70">
            {testType === "full" ? "Full-length SAT Report" : `Sectional - ${activeTest.sectionalSubject}`}
          </p>
        </div>
        {testType === "full" ? (
          <div className="workbook-sticker bg-primary text-ink-fg">
            <Trophy className="h-3.5 w-3.5" />
            Score: {fullLengthScore}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t-2 border-ink-fg/15 pt-4">
        <span className="workbook-sticker bg-accent-2 text-white">
          <CheckCircle2 className="h-3.5 w-3.5" /> {stats.correct} Correct
        </span>
        <span className="workbook-sticker bg-accent-3 text-white">
          <XCircle className="h-3.5 w-3.5" /> {stats.wrong} Wrong
        </span>
        <span className="workbook-sticker bg-surface-white text-ink-fg">
          <MinusCircle className="h-3.5 w-3.5" /> {stats.omitted} Omitted
        </span>
      </div>
      </div>
    </div>
  );
}

function FullLengthReport({
  activeTest,
  onSelectAnswer,
}: {
  activeTest: ReviewResult;
  onSelectAnswer: (payload: { answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;
}) {
  const { rwModule1, rwModule2, mathModule1, mathModule2 } = groupFullLengthAnswers(activeTest);

  return (
    <div className="space-y-6">
      <div className="workbook-panel overflow-hidden">
        <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border-2 border-ink-fg bg-accent-1 p-2 brutal-shadow-sm">
            <BookOpen className="h-4 w-4 text-ink-fg" />
          </div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Reading &amp; Writing</h2>
        </div>
        </div>

        <div className="space-y-6 p-6">
        {[
          { label: "Module 1", answers: rwModule1, startIndex: 0 },
          { label: "Module 2", answers: rwModule2, startIndex: 0 },
        ].map(({ label, answers, startIndex }) => {
          const stats = getReviewStats(answers);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.16em] text-ink-fg">{label}</span>
                <div className="flex items-center gap-3 text-xs text-ink-fg/70">
                  <span>{answers.length} questions |</span>
                  <span>
                    {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
                  </span>
                </div>
              </div>
              <div className="mb-1 h-px bg-ink-fg/15" />
              <AnswerGrid answers={answers} startIndex={startIndex} testId={activeTest.testId?._id} onSelectAnswer={onSelectAnswer} />
            </div>
          );
        })}
        </div>
      </div>

      <div className="workbook-panel overflow-hidden">
        <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border-2 border-ink-fg bg-accent-2 p-2 text-white brutal-shadow-sm">
            <Calculator className="h-4 w-4" />
          </div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Math</h2>
        </div>
        </div>

        <div className="space-y-6 p-6">
        {[
          { label: "Module 1", answers: mathModule1, startIndex: 0 },
          { label: "Module 2", answers: mathModule2, startIndex: 0 },
        ].map(({ label, answers, startIndex }) => {
          const stats = getReviewStats(answers);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.16em] text-ink-fg">{label}</span>
                <div className="flex items-center gap-3 text-xs text-ink-fg/70">
                  <span>{answers.length} questions |</span>
                  <span>
                    {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
                  </span>
                </div>
              </div>
              <div className="mb-1 h-px bg-ink-fg/15" />
              <AnswerGrid answers={answers} startIndex={startIndex} testId={activeTest.testId?._id} onSelectAnswer={onSelectAnswer} />
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function SectionalReport({
  activeTest,
  onSelectAnswer,
}: {
  activeTest: ReviewResult;
  onSelectAnswer: (payload: { answer: ReviewAnswer; questionNumber: number; testId?: string }) => void;
}) {
  const colors = getSectionalColors(activeTest.sectionalSubject || "");
  const answers = activeTest.answers || [];
  const stats = getReviewStats(answers);

  return (
    <div className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
      <div className="flex items-center gap-2">
        <div className={`rounded-2xl border-2 border-ink-fg p-2 brutal-shadow-sm ${colors.icon}`}>{getSectionalIcon(activeTest.sectionalSubject || "")}</div>
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">{toTitleCase(activeTest.sectionalSubject || "")}</h2>
      </div>
      </div>

      <div className="p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-ink-fg">Module {activeTest.sectionalModule}</span>
          <div className="flex items-center gap-3 text-xs text-ink-fg/70">
            <span>{answers.length} questions |</span>
            <span>
              {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
            </span>
          </div>
        </div>
        <div className="mb-1 h-px bg-ink-fg/15" />
        <AnswerGrid answers={answers} startIndex={0} testId={activeTest.testId?._id} onSelectAnswer={onSelectAnswer} />
      </div>
    </div>
  );
}

export function ReviewReport({ testType, activeTest, onSelectAnswer }: ReviewReportProps) {
  if (!activeTest) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-ink-fg">
        <div className="workbook-panel max-w-sm p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="font-display text-3xl font-black uppercase tracking-tight">No test results found</p>
          <p className="mt-2 text-sm leading-6">Complete a test to see your grid report here.</p>
        </div>
      </div>
    );
  }

  const skillData = getSkillPerformance(activeTest.answers || []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ReviewSummaryCard testType={testType} activeTest={activeTest} />
      {skillData.length > 0 && <SkillPerformanceCard data={skillData} />}
      {testType === "full" ? (
        <FullLengthReport activeTest={activeTest} onSelectAnswer={onSelectAnswer} />
      ) : (
        <SectionalReport activeTest={activeTest} onSelectAnswer={onSelectAnswer} />
      )}

      <div className="flex flex-wrap items-center gap-4 px-1 pb-4">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Legend:</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-accent-2">
          <span className="inline-block h-3.5 w-3.5 rounded-md border-2 border-ink-fg bg-accent-2" /> Correct
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-accent-3">
          <span className="inline-block h-3.5 w-3.5 rounded-md border-2 border-ink-fg bg-accent-3" /> Incorrect
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-fg/70">
          <span className="inline-block h-3.5 w-3.5 rounded-md border-2 border-ink-fg bg-surface-white" /> Omitted
        </span>
      </div>
    </div>
  );
}
