"use client";

import { useState } from "react";
import { Button } from "antd";
import { AlertTriangle, Calculator, ChevronDown, CircleX, Clock3, Eye, EyeOff } from "lucide-react";

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
  onSubmitIntent?: () => void;
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
  onSubmitIntent,
  reportContext,
}: TestHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileConfirmOpen, setMobileConfirmOpen] = useState(false);
  const [mobileLeaveOpen, setMobileLeaveOpen] = useState(false);
  const themePreset = getTestingRoomThemePreset(theme);
  const headerTheme = themePreset.header;
  const submitButtonLabel = buttonText || (isLastModule ? "Submit Test" : "Next Module");
  const submitButtonClass = headerTheme.submitPrimaryClass;
  const confirmDialogTitle = confirmTitle || (isLastModule ? "Submit Entire Test?" : "Finish This Module?");
  const confirmDialogDescription =
    confirmDescription ||
    (isLastModule
      ? "You are about to finish the test. You cannot go back to any module after this."
      : "Once you move to the next module, you cannot return to the current questions.");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <header className={`fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between px-3 sm:h-20 sm:px-6 ${headerTheme.shellClass}`}>
        <div className="flex min-w-0 flex-1 items-center sm:flex-1">
          <div className="min-w-0">
            <h1 className={`truncate text-lg leading-none tracking-tight sm:text-2xl ${headerTheme.titleClass}`}>{sectionName}</h1>
          </div>
        </div>

        <div className="hidden items-center justify-center sm:absolute sm:left-1/2 sm:flex sm:-translate-x-1/2">
          <div className={`flex flex-col items-center px-4 py-2 ${headerTheme.timerShellClass}`}>
            <div className="flex items-center gap-3">
              {!isTimerHidden ? (
                <span
                  className={`text-xl font-mono font-bold tracking-wider ${
                    timeRemaining < 300 ? headerTheme.timerWarningTextClass : headerTheme.timerTextClass
                  }`}
                >
                  {formatTime(timeRemaining)}
                </span>
              ) : (
                <span className={`text-xl font-mono tracking-wider ${headerTheme.timerHiddenTextClass}`}>--:--</span>
              )}

              <button onClick={() => setIsTimerHidden(!isTimerHidden)} type="button" className={`rounded-full p-2 ${headerTheme.iconButtonClass}`}>
                {isTimerHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-4 sm:flex">
          {reportContext ? <ReportErrorButton context={reportContext} compact theme={theme} /> : null}

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
                onMouseEnter={onSubmitIntent}
                onTouchStart={onSubmitIntent}
                className={`!h-11 !px-6 !font-bold ${submitButtonClass}`}
              >
                {submitButtonLabel}
              </Button>
            </AlertDialogTrigger>

            <ConfirmDialogContent
              theme={theme}
              title={confirmDialogTitle}
              description={confirmDialogDescription}
              onConfirm={onTimeUp}
            />
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className={`flex items-center justify-center rounded-full p-2 outline-none ${headerTheme.leaveButtonClass}`}>
                <CircleX className="h-5 w-5" />
              </button>
            </AlertDialogTrigger>

            <LeaveDialogContent theme={theme} onLeave={onLeave} />
          </AlertDialog>
        </div>

        <div className="flex items-center sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 ${headerTheme.timerShellClass}`}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle mobile test controls"
          >
            <Clock3 className="h-4 w-4" />
            <span className={`font-mono text-sm font-bold tracking-wider ${isTimerHidden ? headerTheme.timerHiddenTextClass : timeRemaining < 300 ? headerTheme.timerWarningTextClass : headerTheme.timerTextClass}`}>
              {isTimerHidden ? "--:--" : formatTime(timeRemaining)}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </header>

      {mobileMenuOpen ? <button type="button" className="fixed inset-0 top-14 z-40 bg-ink-fg/10 sm:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="Close mobile controls" /> : null}

      {mobileMenuOpen ? (
        <div className={`fixed left-3 right-3 top-[4.2rem] z-50 sm:hidden ${headerTheme.mobileMenuClass}`}>
          <div className={`flex items-center justify-between gap-3 ${headerTheme.mobileMenuSectionClass}`}>
            <div>
              <p className={`text-[0.65rem] font-bold uppercase tracking-[0.14em] ${headerTheme.mobileMenuLabelClass}`}>Clock</p>
              <p className={`mt-0.5 font-mono text-lg font-bold ${timeRemaining < 300 ? headerTheme.timerWarningTextClass : headerTheme.timerTextClass}`}>
                {isTimerHidden ? "--:--" : formatTime(timeRemaining)}
              </p>
            </div>
            <button onClick={() => setIsTimerHidden(!isTimerHidden)} type="button" className={`rounded-full p-2 ${headerTheme.iconButtonClass}`}>
              {isTimerHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {reportContext ? (
              <div className={`flex items-center justify-between ${headerTheme.mobileMenuSectionClass}`}>
                <span className="text-sm font-bold uppercase tracking-[0.12em]">Feedback</span>
                <ReportErrorButton context={reportContext} compact theme={theme} />
              </div>
            ) : null}

            {showCalculator ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onToggleCalculator?.();
                }}
                className={`flex w-full items-center justify-between px-3 py-3 text-sm font-bold uppercase tracking-[0.12em] ${headerTheme.mobileMenuSecondaryActionClass} ${headerTheme.mobileMenuActionShapeClass}`}
              >
                Calculator
                <Calculator className="h-4 w-4" />
              </button>
            ) : null}

            <button
              type="button"
              onMouseEnter={onSubmitIntent}
              onTouchStart={onSubmitIntent}
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileConfirmOpen(true);
              }}
              className={`flex w-full items-center justify-center rounded-2xl border-2 px-4 py-3 text-sm font-bold ${submitButtonClass}`}
            >
              {submitButtonLabel}
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileLeaveOpen(true);
              }}
              className={`flex w-full items-center justify-center px-4 py-3 text-sm font-bold ${headerTheme.leaveButtonClass} ${headerTheme.leaveButtonShapeClass}`}
            >
              Quit
            </button>
          </div>
        </div>
      ) : null}

      <AlertDialog open={mobileConfirmOpen} onOpenChange={setMobileConfirmOpen}>
        <ConfirmDialogContent
          theme={theme}
          title={confirmDialogTitle}
          description={confirmDialogDescription}
          onConfirm={() => {
            setMobileConfirmOpen(false);
            onTimeUp();
          }}
        />
      </AlertDialog>

      <AlertDialog open={mobileLeaveOpen} onOpenChange={setMobileLeaveOpen}>
        <LeaveDialogContent
          theme={theme}
          onLeave={() => {
            setMobileLeaveOpen(false);
            onLeave();
          }}
        />
      </AlertDialog>
    </>
  );
}

function ConfirmDialogContent({
  theme,
  title,
  description,
  onConfirm,
}: {
  theme: TestingRoomTheme;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  const dialogTheme = getTestingRoomThemePreset(theme).dialog;

  return (
    <AlertDialogContent className={dialogTheme.contentClass}>
      <AlertDialogHeader>
        <div className={dialogTheme.iconPrimaryClass}>
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <AlertDialogTitle className={dialogTheme.titleClass}>{title}</AlertDialogTitle>
        <AlertDialogDescription className={dialogTheme.descriptionClass}>{description}</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel asChild>
          <AlertDialogCancelButton className={dialogTheme.cancelButtonClass}>No</AlertDialogCancelButton>
        </AlertDialogCancel>
        <AlertDialogAction asChild>
          <AlertDialogActionButton className={dialogTheme.confirmButtonClass} onClick={onConfirm}>
            Yes
          </AlertDialogActionButton>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

function LeaveDialogContent({ theme, onLeave }: { theme: TestingRoomTheme; onLeave: () => void }) {
  const dialogTheme = getTestingRoomThemePreset(theme).dialog;

  return (
    <AlertDialogContent className={dialogTheme.contentClass}>
      <AlertDialogHeader>
        <div className={dialogTheme.iconDangerClass}>
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <AlertDialogTitle className={dialogTheme.titleClass}>Leave Exam?</AlertDialogTitle>
        <AlertDialogDescription className={dialogTheme.descriptionClass}>Are you sure you want to leave? Your progress will not be saved.</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel asChild>
          <AlertDialogCancelButton className={dialogTheme.cancelButtonClass}>Stay</AlertDialogCancelButton>
        </AlertDialogCancel>
        <AlertDialogAction asChild>
          <AlertDialogActionButton className={dialogTheme.dangerButtonClass} onClick={onLeave}>Leave</AlertDialogActionButton>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
