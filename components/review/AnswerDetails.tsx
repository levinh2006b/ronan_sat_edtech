// Review popup content shown when a student opens a specific question.

"use client";

import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

import { getChoiceTextFromStoredAnswer } from "@/utils/gradingHelper";
import { renderHtmlLatexContent } from "@/utils/renderContent";

import "katex/dist/katex.min.css";

type ReviewQuestion = {
  questionType?: "multiple_choice" | "spr";
  choices?: string[];
  correctAnswer?: string;
  sprAnswers?: string[];
};

type ReviewAnswer = {
  userAnswer?: string;
  isCorrect: boolean;
};

interface AnswerDetailsProps {
  q: ReviewQuestion;
  ans: ReviewAnswer;
}

export default function AnswerDetails({ q, ans }: AnswerDetailsProps) {
  const choices = q?.choices || [];
  const optionLabels = ["A", "B", "C", "D"];
  const displayedUserAnswer = getChoiceTextFromStoredAnswer(q, ans?.userAnswer);
  const displayedCorrectAnswer = getChoiceTextFromStoredAnswer(q, q?.correctAnswer);

  if (q.questionType === "spr") {
    
    const isCorrect = ans.isCorrect;
    const isOmitted = !ans.userAnswer || ans.userAnswer === "Omitted"; 
    const isWrong = !isCorrect && !isOmitted;

    const wrapClassName = isCorrect
      ? "bg-primary text-ink-fg"
      : isWrong
        ? "bg-accent-3 text-white"
        : "bg-surface-white text-ink-fg";
    const badgeClassName = isCorrect ? "bg-surface-white text-ink-fg" : isWrong ? "bg-ink-fg text-white" : "bg-paper-bg text-ink-fg";
    const Icon = isCorrect ? CheckCircle : isWrong ? XCircle : null;

    return (
      <div className="flex flex-col gap-3">
        <div className={`rounded-2xl border-2 border-ink-fg p-4 brutal-shadow-sm ${wrapClassName}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">Your answer</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-xl border-2 border-ink-fg px-3 py-1.5 text-sm font-black ${badgeClassName}`}>
                  <span className="font-[Georgia,serif]">{renderHtmlLatexContent(ans.userAnswer || "Omitted")}</span>
                </span>
              </div>
            </div>
            {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-fg/70">Accepted</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {q.sprAnswers?.filter(Boolean).map((answer: string, index: number) => (
              <span key={index} className="rounded-xl border-2 border-ink-fg bg-surface-white px-3 py-1.5 font-black text-ink-fg">
                <span className="font-[Georgia,serif]">{renderHtmlLatexContent(answer ?? "")}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (choices.length === 0) {
    return (
        <div className="rounded-2xl border-2 border-ink-fg bg-accent-3 p-5 text-white">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          <AlertCircle className="h-4 w-4" />
          Missing choices data from API
        </div>
        <p className="mb-4 text-xs leading-6 text-white/85">
          Update <code className="rounded bg-white/20 px-1.5 py-0.5 font-mono">app/api/results/route.ts</code> to return
          <code className="ml-1 rounded bg-white/20 px-1.5 py-0.5 font-mono">choices</code> for each question.
        </p>
          <div className="flex flex-col gap-2 rounded-xl border-2 border-ink-fg bg-surface-white p-4 text-sm text-ink-fg">
          <div className="flex gap-2">
            <span className="w-28 shrink-0 font-bold uppercase tracking-[0.12em] text-ink-fg/70">Your answer</span>
            <span className={`font-black ${ans.isCorrect ? "text-ink-fg" : "text-accent-3"}`}>
              <span className="font-[Georgia,serif]">{displayedUserAnswer || "Omitted"}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-28 shrink-0 font-bold uppercase tracking-[0.12em] text-ink-fg/70">Correct</span>
            <span className="font-black text-ink-fg">
              <span className="font-[Georgia,serif]">{renderHtmlLatexContent(displayedCorrectAnswer)}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice: string, index: number) => {
        const storedChoiceCode = `choice_${index}`;
        const isUserChoice = ans?.userAnswer === storedChoiceCode || ans?.userAnswer === choice;
        const isCorrectChoice = q?.correctAnswer === storedChoiceCode || q?.correctAnswer === choice;

        let wrapClassName = "bg-surface-white text-ink-fg";
        let circleClassName = "bg-paper-bg text-ink-fg";
        let Icon = null;

        if (isCorrectChoice) {
          wrapClassName = "bg-primary text-ink-fg";
          circleClassName = "bg-surface-white text-ink-fg";
          Icon = CheckCircle;
        } else if (isUserChoice) {
          wrapClassName = "bg-accent-3 text-white";
          circleClassName = "bg-ink-fg text-white";
          Icon = XCircle;
        }

        const isNeutralChoice = !isCorrectChoice && !isUserChoice;
        const interactiveClassName = isNeutralChoice
          ? "workbook-press hover:bg-paper-bg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          : "";

        return (
          <div key={index} className={`flex items-center gap-3.5 rounded-2xl border-2 border-ink-fg px-4 py-3.5 brutal-shadow-sm ${wrapClassName} ${interactiveClassName}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink-fg text-sm font-black ${circleClassName}`}>
              {optionLabels[index] || ""}
            </div>
            <span className="flex-1 font-[Georgia,serif] text-[15.5px] leading-[1.65]">
              {renderHtmlLatexContent(choice ?? "")}
            </span>
            {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
          </div>
        );
      })}
    </div>
  );
}
