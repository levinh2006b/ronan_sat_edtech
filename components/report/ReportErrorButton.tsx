"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { API_PATHS } from "@/lib/apiPaths";
import { getTestingRoomThemePreset, type TestingRoomTheme } from "@/lib/testingRoomTheme";

type ReportErrorButtonProps = {
  context: {
    testId: string;
    questionId: string;
    section: string;
    module: number;
    questionNumber: number;
    source: "test" | "review";
  };
  className?: string;
  compact?: boolean;
  theme?: TestingRoomTheme;
};

export function ReportErrorButton({
  context,
  className = "",
  compact = false,
  theme,
}: ReportErrorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<"Question" | "Answers" | "Missing Graph/Image">("Question");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const title = useMemo(
    () => `Q${context.questionNumber} - ${context.section} - Module ${context.module}`,
    [context.module, context.questionNumber, context.section],
  );
  const themePreset = theme ? getTestingRoomThemePreset(theme) : null;
  const triggerClassName = themePreset?.header.reportTriggerClass;
  const reportTheme = themePreset?.report;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(API_PATHS.TEST_MANAGER_REPORTS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...context,
          reason,
          additionalContext,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setMessage("You already reported this question.");
          return;
        }

        throw new Error("Failed to submit report");
      }

      setMessage("Report sent.");
      setAdditionalContext("");
      setReason("Question");
      window.setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
      }, 900);
    } catch (error) {
      console.error(error);
      setMessage("Could not send report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        title="Report Error"
        aria-label="Report Error"
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setMessage(null);
        }}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
          triggerClassName
            ? triggerClassName
            : compact
              ? "border-2 border-ink-fg bg-paper-bg text-ink-fg workbook-press"
              : "border-2 border-ink-fg bg-surface-white text-ink-fg workbook-press"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className={`absolute right-0 top-[calc(100%+10px)] z-[120] w-[320px] ${reportTheme?.panelClass ?? "rounded-2xl border-2 border-ink-fg bg-surface-white p-4 brutal-shadow"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={reportTheme?.titleClass ?? "text-sm font-black uppercase tracking-[0.14em] text-ink-fg"}>Report Error</div>
              <div className={reportTheme?.metaClass ?? "mt-1 text-[11px] leading-4 text-ink-fg/70"}>{title}</div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className={reportTheme?.closeButtonClass ?? "rounded-full border-2 border-ink-fg bg-paper-bg p-1 text-ink-fg workbook-press"}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <div className={reportTheme?.labelClass ?? "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-fg/70"}>Error in</div>
            <div className="grid grid-cols-2 gap-2">
              {(["Question", "Answers", "Missing Graph/Image"] as const).map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => setReason(option)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    option === "Missing Graph/Image" ? "col-span-2" : ""
                  } ${
                    reason === option
                      ? reportTheme?.optionActiveClass ?? "border-2 border-ink-fg bg-primary text-ink-fg"
                      : reportTheme?.optionIdleClass ?? "border-2 border-ink-fg bg-surface-white text-ink-fg"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className={`${reportTheme?.labelClass ?? "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-fg/70"} block`}>Details (optional)</label>
            <textarea
              value={additionalContext}
              onChange={(event) => setAdditionalContext(event.target.value)}
              rows={3}
              placeholder="Tell us what looks wrong..."
              className={reportTheme?.textareaClass ?? "workbook-input min-h-[96px]"}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className={`text-[12px] ${message === "Report sent." ? reportTheme?.successMessageClass ?? "text-accent-2" : message ? reportTheme?.errorMessageClass ?? "text-accent-3" : reportTheme?.neutralMessageClass ?? "text-ink-fg/50"}`}>{message ?? ""}</div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={reportTheme?.submitButtonClass ?? "workbook-button disabled:opacity-60"}
            >
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
