"use client";

import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import Latex from "react-latex-next";

import "katex/dist/katex.min.css";
import { getChoiceTextFromStoredAnswer } from "@/utils/gradingHelper";

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

    const wrapClass = isCorrect
      ? "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-100"
      : isWrong
        ? "border-red-400 bg-red-50 text-red-900 shadow-sm shadow-red-100"
        : "border-slate-200 bg-white text-slate-700";

    const Icon = isCorrect ? CheckCircle : isWrong ? XCircle : null;

    return (
      <div className="flex flex-col gap-3">
        <div className={`flex items-center gap-3.5 rounded-xl border-2 px-4 py-3.5 transition-all duration-150 ${wrapClass}`}>
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest opacity-70">Your answer</p>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-lg border bg-white px-3 py-1.5 text-sm font-bold shadow-sm ${
                  isCorrect
                    ? "border-emerald-200 text-emerald-700"
                    : isWrong
                      ? "border-red-200 text-red-700"
                      : "border-slate-200 text-slate-600"
                }`}
              >
                <Latex>{ans.userAnswer || "Omitted"}</Latex>
              </span>
            </div>
          </div>
          {Icon ? <Icon className="h-4.5 w-4.5 shrink-0 opacity-70" /> : null}
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3.5 shadow-sm shadow-emerald-100">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-700/60">Accepted</p>
            <div className="flex flex-wrap gap-2">
              {q.sprAnswers?.filter(Boolean).map((answer: string, index: number) => (
                <span
                  key={index}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 font-bold text-emerald-700 shadow-sm"
                >
                  <Latex>{answer}</Latex>
                </span>
              ))}
            </div>
          </div>
          <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-700 opacity-70" />
        </div>
      </div>
    );
  }

  if (choices.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
          <AlertCircle className="h-4 w-4" />
          Missing choices data from API
        </div>
        <p className="mb-4 text-xs text-amber-700">
          Update <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">app/api/results/route.ts</code> to return
          <code className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 font-mono">choices</code> for each question.
        </p>
        <div className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-white p-4 text-sm">
          <div className="flex gap-2">
            <span className="w-28 shrink-0 font-medium text-slate-500">Your answer:</span>
            <span className={`font-bold ${ans.isCorrect ? "text-emerald-600" : "text-red-600"}`}>
              {displayedUserAnswer || "Omitted"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-28 shrink-0 font-medium text-slate-500">Correct answer:</span>
            <span className="font-bold text-emerald-600">
              <Latex>{displayedCorrectAnswer}</Latex>
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

        let wrapClass = "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm";
        let circleClass = "border-slate-300 bg-white text-slate-500";
        let Icon = null;

        if (isCorrectChoice) {
          wrapClass = "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-100";
          circleClass = "border-emerald-500 bg-emerald-500 text-white";
          Icon = CheckCircle;
        } else if (isUserChoice) {
          wrapClass = "border-red-400 bg-red-50 text-red-900 shadow-sm shadow-red-100";
          circleClass = "border-red-500 bg-red-500 text-white";
          Icon = XCircle;
        }

        return (
          <div
            key={index}
            className={`flex items-center gap-3.5 rounded-xl border-2 px-4 py-3.5 transition-all duration-150 ${wrapClass}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${circleClass}`}>
              {optionLabels[index] || ""}
            </div>
            <span className="flex-1 text-[15px] font-medium leading-snug">
              <Latex>{choice}</Latex>
            </span>
            {Icon ? <Icon className="h-4.5 w-4.5 shrink-0 opacity-70" /> : null}
          </div>
        );
      })}
    </div>
  );
}
