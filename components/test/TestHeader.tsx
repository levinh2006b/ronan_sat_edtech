"use client";

import { Button } from "antd";
import { AlertTriangle, Calculator, CircleX, Eye, EyeOff } from "lucide-react";

import { ReportErrorButton } from "@/components/report/ReportErrorButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogActionButton,
  AlertDialogCancel,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getTestingRoomThemePreset, type TestingRoomTheme } from "@/lib/testingRoomTheme";

interface TestHeaderProps {
  theme?: TestingRoomTheme;
  sectionName: string;
  timeRemaining: number;
  onTimeUp: () => void;
  isSubmitting?: boolean;
  isTimerHidden: boolean;
  setIsTimerHidden: (hide: boolean) => void;
  isLastModule?: boolean;
  showCalculator?: boolean;
  buttonText?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  onToggleCalculator?: () => void;
  onLeave: () => void;
  reportContext?: {
    testId: string;
    questionId: string;
    section: string;
    module: number;
    questionNumber: number;
    source: "test" | "review";
  };
}

export default function TestHeader({
  theme = "ronan",
  sectionName,
  timeRemaining,
  onTimeUp,
  isSubmitting = false,
  isTimerHidden,
  setIsTimerHidden,
  onToggleCalculator,
  isLastModule,
  showCalculator = true,
  buttonText,
  confirmTitle,
  confirmDescription,
  onLeave,
  reportContext,
}: TestHeaderProps) {
  const themePreset = getTestingRoomThemePreset(theme);
  const headerTheme = themePreset.header;
  const submitButtonLabel = buttonText || (isLastModule ? "Submit Test" : "Next Module");
  const isFinalSubmit = submitButtonLabel === "Submit Test" || isLastModule;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 flex h-20 items-center justify-between px-4 sm:px-6 ${headerTheme.shellClass}`}
    >
      <div className="flex flex-1 items-center">
        <div>
          <h1 className={`text-2xl tracking-tight ${headerTheme.titleClass}`}>
            {sectionName}
          </h1>
        </div>
      </div>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center">
        <div
          className={`flex flex-col items-center px-4 py-2 ${headerTheme.timerShellClass}`}
        >
          <div className="flex items-center gap-3">
            {!isTimerHidden ? (
              <span
                className={`text-xl font-mono font-bold tracking-wider ${
                  timeRemaining < 300
                    ? headerTheme.timerWarningTextClass
                    : headerTheme.timerTextClass
                }`}
              >
                {formatTime(timeRemaining)}
              </span>
            ) : (
              <span className={`text-xl font-mono tracking-wider ${headerTheme.timerHiddenTextClass}`}>--:--</span>
            )}

            <button
              onClick={() => setIsTimerHidden(!isTimerHidden)}
              type="button"
              className={`rounded-full p-2 ${headerTheme.iconButtonClass}`}
            >
              {isTimerHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        {reportContext ? <ReportErrorButton context={reportContext} compact /> : null}

        {showCalculator ? (
          <button
            onClick={onToggleCalculator}
            type="button"
            title="Calculator"
            className={`flex items-center justify-center rounded-full p-2 outline-none ${headerTheme.iconButtonClass}`}
          >
            <Calculator className="h-5 w-5" />
          </button>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="default"
              loading={isSubmitting}
              disabled={isSubmitting}
              danger={isFinalSubmit}
              className={`!h-11 !px-6 !font-bold ${isFinalSubmit ? headerTheme.submitDangerClass : headerTheme.submitPrimaryClass}`}
            >
              {submitButtonLabel}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink-fg bg-primary text-ink-fg brutal-shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle>{confirmTitle || (isLastModule ? "Submit Entire Test?" : "Finish This Module?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDescription ||
                  (isLastModule
                    ? "You are about to finish the test. You cannot go back to any module after this."
                    : "Once you move to the next module, you cannot return to the current questions.")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <AlertDialogCancelButton>No</AlertDialogCancelButton>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <AlertDialogActionButton
                  className={isFinalSubmit ? "!bg-accent-3 !text-surface-white" : "!bg-primary !text-ink-fg"}
                  onClick={onTimeUp}
                >
                  Yes
                </AlertDialogActionButton>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className={`flex items-center justify-center rounded-full p-2 text-ink-fg outline-none ${headerTheme.leaveButtonClass}`}
            >
              <CircleX className="h-5 w-5" />
            </button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink-fg bg-[var(--color-accent-3)] text-surface-white brutal-shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle>Leave Exam?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave? Your progress will not be saved.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <AlertDialogCancelButton>Stay</AlertDialogCancelButton>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <AlertDialogActionButton onClick={onLeave}>Leave</AlertDialogActionButton>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

    </header>
  );
}
