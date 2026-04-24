"use client";

import { useState } from "react";

import DesmosCalculator from "@/components/DesmosCalculator";
import InitialTabBootReady from "@/components/InitialTabBootReady";
import QuestionViewer from "@/components/QuestionViewer";
import SimpleLoading from "@/components/SimpleLoading";
import TestFooter from "@/components/test/TestFooter";
import TestHeader from "@/components/test/TestHeader";
import TestReviewPage from "@/components/test/TestReviewPage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogActionButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTestingRoomTheme } from "@/hooks/useTestingRoomTheme";
import { getTestingRoomThemePreset } from "@/lib/testingRoomTheme";
import { useResizableDivider } from "@/hooks/useResizableDivider";
import { useTestEngine } from "@/hooks/useTestEngine";

export default function TestEngine({ testId }: { testId: string }) {   // Khởi tạo phòng thi, lấy về id của bài test
  const { theme: testingRoomTheme } = useTestingRoomTheme();           // Lấy theme bài test, đổi tên thành testingRoomTheme
  const themePreset = getTestingRoomThemePreset(testingRoomTheme);     // Lấy thông số cấu hình của theme mới
  const {
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
    isDiscardDialogOpen,
    setIsDiscardDialogOpen,
    availableModules,
    answeredCurrentModuleQuestions,
    minimumRequiredCurrentModuleAnswers,
    handleAnswerSelect,
    toggleFlag,
    handleNext,
    handlePrev,
    handleJump,
    handleSubmit,
    router,
  } = useTestEngine(testId);  // hàm này (đã được lập trình ở chỗ khác) sẽ nhận mã testId, tự động tính toán và đưa ra các dữ liệu để dùng 
  
  
  const [isReviewPageOpen, setIsReviewPageOpen] = useState(false);   // Check trang review đang đóng hay mở

  const { leftWidth, isDragging, containerRef, handleDividerMouseDown } = useResizableDivider(50);  // Công cụ cho kéo thay đổi kich thước bài test
  const discardExitHref = mode === "sectional" ? "/sectional" : "/full-length";  // Tính toán để nếu User thoát thì điều hướng về đâu

  if (loading) {
    return <SimpleLoading />;
  }

  if (questions.length === 0) {
    return (
      <div className="bg-dot-pattern flex min-h-screen items-center justify-center bg-paper-bg p-6">
        <InitialTabBootReady />
        <div className="workbook-panel max-w-lg px-8 py-10 text-center">
          <div className="workbook-sticker bg-accent-3 text-white">Test Unavailable</div>
          <h1 className="mt-5 font-display text-4xl font-black uppercase tracking-tight text-ink-fg">No questions found</h1>
          <p className="mt-3 text-base leading-7 text-ink-fg/75">
            This test could not be loaded, so there is nothing to start right now.
          </p>
          <div className="mt-6 flex justify-center">
            <button onClick={() => router.push("/full-length")} className="workbook-button" type="button">
              Return to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLastModule =    
    availableModules.length === 0 || availableModules[availableModules.length - 1].originalIndex === currentStageIndex;
    // Check xem còn module nào tiếp theo không hoặc index của module hiện tại có trùng với chỉ số của module cuối k
    // nếu 1 trong 2 đúng thì isLastModule = true

  const buttonText = mode === "sectional" ? "Submit Module" : isLastModule ? "Submit Test" : "Next Module";
  // nếu mode là sectional -> nút luôn hiện Submit Module
  // là full-length thì hiện theo logic trên


  // Logic yêu cầu hoàn thành min câu để được nộp
  const confirmDescription =
    mode === "sectional"
      ? `You must answer at least ${minimumRequiredCurrentModuleAnswers} questions before submitting this module.`
      : isLastModule
        ? `You must answer at least ${minimumRequiredCurrentModuleAnswers} questions in this module before submitting the test.`
        : `You must answer at least ${minimumRequiredCurrentModuleAnswers} questions in this module before moving on.`;


  return (
    <div
      className={`relative flex min-h-screen flex-col overflow-hidden ${themePreset.shell.rootClass}`}
    >
      <InitialTabBootReady />
      <AlertDialog open={isDiscardDialogOpen}>
        <AlertDialogContent className={themePreset.dialog.contentClass}>
          <AlertDialogHeader>
            <div className={themePreset.dialog.iconDangerClass}>Time&apos;s up</div>
            <AlertDialogTitle className={themePreset.dialog.titleClass}>Result Discarded</AlertDialogTitle>
            <AlertDialogDescription className={themePreset.dialog.descriptionClass}>
              You answered {answeredCurrentModuleQuestions} of {currentModuleQuestions.length} questions in this module. You must complete at least {minimumRequiredCurrentModuleAnswers} questions to save anything, so this attempt was discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <AlertDialogActionButton
                className={themePreset.dialog.dangerButtonClass}
                onClick={() => {
                  setIsDiscardDialogOpen(false);
                  router.push(discardExitHref);
                }}
              >
                Return to Library
              </AlertDialogActionButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TestHeader
        theme={testingRoomTheme}
        sectionName={`${currentStage.section} - Module ${currentStage.module}`}
        timeRemaining={timeRemaining}
        onTimeUp={handleSubmit}
        isSubmitting={isSubmitting}
        isTimerHidden={isTimerHidden}
        setIsTimerHidden={setIsTimerHidden}
        onToggleCalculator={() => setIsCalculatorOpen(!isCalculatorOpen)}
        showCalculator={currentStage.section === "Math"}
        buttonText={buttonText}
        confirmTitle={buttonText}
        confirmDescription={confirmDescription}
        onSubmitIntent={() => {
          router.prefetch(`/review?testId=${testId}&mode=${mode === "sectional" ? "sectional" : "full"}`);
        }}
        onLeave={() => router.push(mode === "sectional" ? "/sectional" : "/full-length")}
        reportContext={{
          testId,
          questionId: currentQuestion._id,
          section: currentStage.section,
          module: currentStage.module,
          questionNumber: currentIndex + 1,
          source: "test",
        }}
      />

      <DesmosCalculator theme={testingRoomTheme} isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />

      <main
        ref={containerRef}
        className={`relative flex-1 overflow-hidden ${themePreset.shell.mainClass}`}
        style={{ userSelect: isDragging.current ? "none" : "auto" }}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("#qv-divider")) {
            handleDividerMouseDown(event);
          }
        }}
      >
        {isReviewPageOpen ? (
          <TestReviewPage
            theme={testingRoomTheme}
            moduleName={`Section ${currentStage.section === "Math" ? 2 : 1}, Module ${currentStage.module}: ${currentStage.section}`}
            currentIndex={currentIndex}
            questions={currentModuleQuestions}
            answers={answers}
            flagged={flagged}
            submitLabel={buttonText}
            minimumRequiredAnswers={minimumRequiredCurrentModuleAnswers}
            answeredCount={answeredCurrentModuleQuestions}
            onJump={(index) => {
              handleJump(index);
              setIsReviewPageOpen(false);
            }}
            onReturn={() => setIsReviewPageOpen(false)}
            onSubmit={() => {
              setIsReviewPageOpen(false);
              void handleSubmit();
            }}
          />
        ) : (
          <QuestionViewer
            theme={testingRoomTheme}
            question={currentQuestion}
            userAnswer={answers[currentQuestion._id]}
            onAnswerSelect={handleAnswerSelect}
            isFlagged={!!flagged[currentQuestion._id]}
            onToggleFlag={toggleFlag}
            index={currentIndex}
            leftWidth={leftWidth}
          />
        )}
      </main>

      {isReviewPageOpen ? null : (
        <TestFooter
          theme={testingRoomTheme}
          moduleName={`Section ${currentStage.section === "Math" ? 2 : 1}, Module ${currentStage.module}: ${currentStage.section}`}
          currentIndex={currentIndex}
          totalQuestions={currentModuleQuestions.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onJump={handleJump}
          answers={answers}
          flagged={flagged}
          questions={currentModuleQuestions}
          onOpenReviewPage={() => setIsReviewPageOpen(true)}
        />
      )}
    </div>
  );
}
