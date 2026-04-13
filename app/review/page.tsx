"use client";

import { Suspense } from "react";

import ReviewPageSkeleton from "@/components/ReviewPageSkeleton";
import ReviewPopup from "@/components/ReviewPopup";
import { ReviewReport } from "@/components/review/ReviewReport";
import { ReviewResultsSidebar } from "@/components/review/ReviewResultsSidebar";
import { useReviewPageController } from "@/components/review/useReviewPageController";

function ReviewContent() {
  const {
    status,
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
    setActiveTestId,
    setSelectedAnswer,
    handleExpandExplanation,
  } = useReviewPageController();

  if ((loading && filteredResults.length === 0) || (status === "loading" && filteredResults.length === 0)) {
    return <ReviewPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-paper-bg lg:flex">
      <ReviewResultsSidebar
        refreshing={refreshing}
        testType={testType}
        activeTestId={activeTestId}
        filteredResults={filteredResults}
        onChangeType={setTestType}
        onSelectTest={setActiveTestId}
      />

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Review Studio</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
              Learn from your mistakes.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
              Open a result from the left shelf, scan your miss patterns, and jump directly into the questions that need correction.
            </p>
          </div>
        </section>

        <ReviewReport testType={testType} activeTest={activeTest} onSelectAnswer={setSelectedAnswer} />
      </main>

      {selectedAnswer ? (
        <ReviewPopup
          ans={selectedAnswer.answer}
          onClose={() => setSelectedAnswer(null)}
          expandedExplanation={expandedExplanations[selectedAnswer.answer.questionId?._id || ""]}
          loadingExplanation={!!loadingExplanations[selectedAnswer.answer.questionId?._id || ""]}
          onExpandExplanation={handleExpandExplanation}
          reportContext={
            selectedAnswer.testId && selectedAnswer.answer.questionId?._id && selectedAnswer.answer.questionId.section && selectedAnswer.answer.questionId.module
              ? {
                  testId: selectedAnswer.testId,
                  questionId: selectedAnswer.answer.questionId._id,
                  section: selectedAnswer.answer.questionId.section,
                  module: selectedAnswer.answer.questionId.module,
                  questionNumber: selectedAnswer.questionNumber,
                  source: "review",
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

export default function GridReviewPage() {
  return (
    <Suspense fallback={<ReviewPageSkeleton />}>
      <ReviewContent />
    </Suspense>
  );
}
