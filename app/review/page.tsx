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
    <div className="flex min-h-screen bg-slate-50">
      <ReviewResultsSidebar
        refreshing={refreshing}
        testType={testType}
        activeTestId={activeTestId}
        filteredResults={filteredResults}
        onChangeType={setTestType}
        onSelectTest={setActiveTestId}
      />

      <main className="flex-1 overflow-y-auto p-8">
        <ReviewReport testType={testType} activeTest={activeTest} onSelectAnswer={setSelectedAnswer} />
      </main>

      {selectedAnswer ? (
        <ReviewPopup
          ans={selectedAnswer}
          onClose={() => setSelectedAnswer(null)}
          expandedExplanation={expandedExplanations[selectedAnswer.questionId?._id || ""]}
          loadingExplanation={!!loadingExplanations[selectedAnswer.questionId?._id || ""]}
          onExpandExplanation={handleExpandExplanation}
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
