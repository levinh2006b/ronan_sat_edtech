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
  groupFullLengthAnswers,
  toTitleCase,
} from "@/components/review/reviewPage.utils";

type ReviewReportProps = {
  testType: "full" | "sectional";
  activeTest?: ReviewResult;
  onSelectAnswer: (answer: ReviewAnswer) => void;
};

function AnswerGrid({
  answers,
  startIndex,
  onSelectAnswer,
}: {
  answers: ReviewAnswer[];
  startIndex: number;
  onSelectAnswer: (answer: ReviewAnswer) => void;
}) {
  if (!answers || answers.length === 0) {
    return <p className="mt-2 text-sm italic text-slate-400">No data for this module.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {answers.map((answer, index) => {
        const isOmitted = !answer.userAnswer || answer.userAnswer === "" || answer.userAnswer === "Omitted";
        let className = "border border-slate-200 bg-slate-50 text-slate-500";

        if (!isOmitted) {
          className = answer.isCorrect
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
        }

        return (
          <button
            key={`${answer.questionId?._id || index}-${startIndex + index}`}
            title={`Q${startIndex + index + 1} - ${isOmitted ? "Omitted" : answer.isCorrect ? "Correct" : "Incorrect"}`}
            onClick={() => onSelectAnswer(answer)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition-all duration-150 hover:scale-110 active:scale-95 ${className}`}
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{activeTest.testId?.title}</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-400">
            {testType === "full" ? "Full-length SAT Report" : `Sectional - ${activeTest.sectionalSubject}`}
          </p>
        </div>
        {testType === "full" ? (
          <div className="flex items-center gap-2 self-start rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-700">Score: {activeTest.score}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> {stats.correct} Correct
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
          <XCircle className="h-3.5 w-3.5" /> {stats.wrong} Wrong
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <MinusCircle className="h-3.5 w-3.5" /> {stats.omitted} Omitted
        </span>
      </div>
    </div>
  );
}

function FullLengthReport({ activeTest, onSelectAnswer }: { activeTest: ReviewResult; onSelectAnswer: (answer: ReviewAnswer) => void }) {
  const { rwModule1, rwModule2, mathModule1, mathModule2 } = groupFullLengthAnswers(activeTest);

  return (
    <div className="space-y-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-100 p-1.5">
            <BookOpen className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="text-base font-bold text-indigo-700">Reading &amp; Writing</h2>
        </div>

        {[
          { label: "Module 1", answers: rwModule1, startIndex: 0 },
          { label: "Module 2", answers: rwModule2, startIndex: 0 },
        ].map(({ label, answers, startIndex }) => {
          const stats = getReviewStats(answers);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-600">{label}</span>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-medium text-indigo-600">
                    {answers.length} Questions
                  </span>
                  <span>
                    {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
                  </span>
                </div>
              </div>
              <div className="mb-1 h-px bg-indigo-100" />
              <AnswerGrid answers={answers} startIndex={startIndex} onSelectAnswer={onSelectAnswer} />
            </div>
          );
        })}
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-100 p-1.5">
            <Calculator className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="text-base font-bold text-blue-700">Math</h2>
        </div>

        {[
          { label: "Module 1", answers: mathModule1, startIndex: 0 },
          { label: "Module 2", answers: mathModule2, startIndex: 0 },
        ].map(({ label, answers, startIndex }) => {
          const stats = getReviewStats(answers);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-blue-600">{label}</span>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                    {answers.length} Questions
                  </span>
                  <span>
                    {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
                  </span>
                </div>
              </div>
              <div className="mb-1 h-px bg-blue-100" />
              <AnswerGrid answers={answers} startIndex={startIndex} onSelectAnswer={onSelectAnswer} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionalReport({ activeTest, onSelectAnswer }: { activeTest: ReviewResult; onSelectAnswer: (answer: ReviewAnswer) => void }) {
  const colors = getSectionalColors(activeTest.sectionalSubject || "");
  const answers = activeTest.answers || [];
  const stats = getReviewStats(answers);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-1.5 ${colors.icon}`}>{getSectionalIcon(activeTest.sectionalSubject || "")}</div>
        <h2 className={`text-base font-bold ${colors.title}`}>{toTitleCase(activeTest.sectionalSubject || "")}</h2>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={`text-sm font-bold ${colors.module}`}>Module {activeTest.sectionalModule}</span>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className={`rounded-md border px-2 py-0.5 font-medium ${colors.badge}`}>{answers.length} Questions</span>
            <span>
              {stats.correct} correct - {stats.wrong} wrong - {stats.omitted} omitted
            </span>
          </div>
        </div>
        <div className={`mb-1 h-px ${colors.divider}`} />
        <AnswerGrid answers={answers} startIndex={0} onSelectAnswer={onSelectAnswer} />
      </div>
    </div>
  );
}

export function ReviewReport({ testType, activeTest, onSelectAnswer }: ReviewReportProps) {
  if (!activeTest) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-base font-semibold text-slate-700">No test results found</p>
          <p className="mt-1 text-sm">Complete a test to see your grid report here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ReviewSummaryCard testType={testType} activeTest={activeTest} />
      {testType === "full" ? (
        <FullLengthReport activeTest={activeTest} onSelectAnswer={onSelectAnswer} />
      ) : (
        <SectionalReport activeTest={activeTest} onSelectAnswer={onSelectAnswer} />
      )}

      <div className="flex items-center gap-4 px-1 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Colors:</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="inline-block h-3.5 w-3.5 rounded-md border border-emerald-400 bg-emerald-50" /> Correct
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-700">
          <span className="inline-block h-3.5 w-3.5 rounded-md border border-red-400 bg-red-50" /> Incorrect
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="inline-block h-3.5 w-3.5 rounded-md border border-slate-300 bg-slate-50" /> Omitted
        </span>
      </div>
    </div>
  );
}
