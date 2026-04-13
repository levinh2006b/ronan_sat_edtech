"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Send, X } from "lucide-react";

import { API_PATHS } from "@/lib/apiPaths";

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
};

export function ReportErrorButton({ context, className = "", compact = false }: ReportErrorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorType, setErrorType] = useState<"Question" | "Answers" | "Missing Graph/Image">("Question");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const title = useMemo(
    () => `Q${context.questionNumber} - ${context.section} - Module ${context.module}`,
    [context.module, context.questionNumber, context.section],
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(API_PATHS.FIX_REPORTS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...context,
          errorType,
          note,
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
      setNote("");
      setErrorType("Question");
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
        className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-ink-fg transition-all workbook-press ${
          compact ? "bg-paper-bg text-ink-fg" : "bg-surface-white text-ink-fg"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[120] w-[320px] rounded-2xl border-2 border-ink-fg bg-surface-white p-4 brutal-shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.14em] text-ink-fg">Report Error</div>
              <div className="mt-1 text-[11px] leading-4 text-ink-fg/70">{title}</div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-full border-2 border-ink-fg bg-paper-bg p-1 text-ink-fg workbook-press">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-fg/70">Error in</div>
            <div className="grid grid-cols-2 gap-2">
              {(["Question", "Answers", "Missing Graph/Image"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setErrorType(option)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    option === "Missing Graph/Image" ? "col-span-2" : ""
                  } ${
                    errorType === option
                      ? "border-2 border-ink-fg bg-primary text-ink-fg"
                      : "border-2 border-ink-fg bg-surface-white text-ink-fg"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-fg/70">Details (optional)</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Tell us what looks wrong..."
              className="workbook-input min-h-[96px]"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className={`text-[12px] ${message === "Report sent." ? "text-accent-2" : message ? "text-accent-3" : "text-ink-fg/50"}`}>{message ?? ""}</div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="workbook-button disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
