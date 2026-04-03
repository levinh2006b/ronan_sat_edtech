"use client";

import { useState } from "react";
import { CldImage } from "next-cloudinary";
import Latex from "react-latex-next";

import "katex/dist/katex.min.css";
import { getChoiceCode } from "@/utils/gradingHelper";

const MAX_SPR_ANSWER_LENGTH = 200;

type ViewerQuestion = {
  _id: string;
  questionType?: "multiple_choice" | "spr";
  questionText?: string;
  passage?: string;
  imageUrl?: string;
  choices?: string[];
};

interface QuestionViewerProps {
  question: ViewerQuestion;
  userAnswer: string;
  onAnswerSelect: (questionId: string, choice: string) => void;
  isFlagged: boolean;
  onToggleFlag: (questionId: string) => void;
  index: number;
  leftWidth?: number;
}

export default function QuestionViewer({
  question,
  userAnswer,
  onAnswerSelect,
  isFlagged,
  onToggleFlag,
  index,
  leftWidth = 50,
}: QuestionViewerProps) {
  const optionLabels = ["A", "B", "C", "D"];
  const [crossedOut, setCrossedOut] = useState<string[]>([]);
  const [showElimination, setShowElimination] = useState(false);

  const toggleCrossOut = (event: React.MouseEvent, choice: string) => {
    event.stopPropagation();
    if (crossedOut.includes(choice)) {
      setCrossedOut(crossedOut.filter((item) => item !== choice));
      return;
    }

    setCrossedOut([...crossedOut, choice]);
  };

  const hasLeftPanel = question.passage || question.imageUrl;
  const leftPct = `${leftWidth}%`;
  const rightPct = `${100 - leftWidth}%`;

  return (
    <div className="mt-16 mb-16 flex h-[calc(100vh-8rem)] w-full overflow-hidden bg-white">
      {hasLeftPanel ? (
        <div className="h-full overflow-y-auto border-r border-slate-300 p-10" style={{ width: leftPct, flexShrink: 0 }}>
          {question.imageUrl ? (
            <div className="mb-6 flex w-full justify-center rounded border border-slate-200 bg-slate-50 p-4">
              <CldImage
                src={question.imageUrl}
                width={350}
                height={350}
                alt="Question Reference"
                className="h-auto max-w-full object-contain"
              />
            </div>
          ) : null}

          {question.passage ? (
            <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-slate-900 selection:bg-yellow-200 selection:text-black">
              <Latex>{question.passage}</Latex>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasLeftPanel ? (
        <div
          id="qv-divider"
          className="group relative z-10 flex flex-shrink-0 cursor-col-resize items-center justify-center bg-slate-200 transition-colors hover:bg-slate-300"
          style={{ width: "4px" }}
        >
          <div
            className="pointer-events-none absolute flex select-none items-center justify-center rounded-sm bg-slate-500 transition-colors group-hover:bg-slate-700"
            style={{ width: "16px", height: "33px", borderRadius: "4px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L3 12L9 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 6L21 12L15 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      ) : null}

      <div
        className={`${hasLeftPanel ? "" : "mx-auto max-w-3xl"} flex h-full flex-col overflow-y-auto`}
        style={{ width: hasLeftPanel ? rightPct : "100%", flexShrink: 0 }}
      >
        <div className="shrink-0 px-6 pb-2 pt-5">
          <div className="flex h-[32px] items-stretch">
            <div className="flex w-[32px] shrink-0 select-none items-center justify-center bg-[#1e293b] text-sm font-bold text-white">
              {index + 1}
            </div>

            <div className="flex flex-1 items-center justify-between bg-slate-100 px-3">
              <button
                onClick={() => onToggleFlag(question._id)}
                className={`cursor-pointer select-none text-[13px] transition-all ${
                  isFlagged
                    ? "font-semibold text-[#1e3a5f] underline underline-offset-2 hover:font-medium hover:no-underline"
                    : "font-medium text-slate-700 hover:font-semibold hover:text-[#1e3a5f] hover:underline hover:underline-offset-2"
                }`}
              >
                Mark for Review
              </button>

              <button
                onClick={() => setShowElimination((prev) => !prev)}
                title={showElimination ? "Tat Process of Elimination" : "Bat Process of Elimination"}
                className={`relative flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border font-bold transition-colors select-none ${
                  showElimination
                    ? "border-[#2B579A] bg-[#2B579A] text-white"
                    : "border-slate-300 bg-white text-slate-700"
                } hover:!border-slate-400 hover:!bg-slate-200 hover:!text-slate-800`}
              >
                <span className="relative z-10 text-[10px] tracking-[-0.08em]">ABC</span>
                <svg
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                  viewBox="0 0 26 26"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line x1="5" y1="21" x2="21" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div
            className="mt-[2px] h-[2px] w-full"
            style={{ backgroundImage: "repeating-linear-gradient(to right, #2d3642 0, #1c2128 19px, transparent 19px, transparent 20px)" }}
          />
        </div>

        <div className="px-6 pb-3 pt-3 text-[15px] leading-relaxed text-slate-900">
          <Latex>{question.questionText}</Latex>
        </div>

        <div className="flex-1 px-6 pb-8">
          {question.questionType === "spr" ? (
            <div className="mt-4">
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                Student-Produced Response (dien dap an)
              </label>
              <input
                type="text"
                value={userAnswer || ""}
                onChange={(event) => onAnswerSelect(question._id, event.target.value)}
                maxLength={MAX_SPR_ANSWER_LENGTH}
                placeholder="Nhap cau tra loi cua ban (VD: 1/3, 0.5, ...)"
                className="w-full max-w-sm rounded border border-slate-400 px-4 py-2.5 text-[15px] text-slate-800 outline-none transition-all focus:border-[#1e3a5f] focus:ring-2 focus:ring-blue-100"
              />
              <div className="mt-2 flex max-w-sm items-center justify-between gap-3 text-sm text-slate-500">
                <p>Ban co the nhap phan so, so thap phan hoac so nguyen.</p>
                <span className={`${(userAnswer || "").length >= MAX_SPR_ANSWER_LENGTH ? "text-amber-600" : ""}`}>
                  {(userAnswer || "").length}/{MAX_SPR_ANSWER_LENGTH}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {question.choices?.map((choice: string, indexChoice: number) => {
                const storedChoiceCode = getChoiceCode(indexChoice);
                const isSelected = userAnswer === storedChoiceCode;
                const isCrossed = crossedOut.includes(choice);
                const label = optionLabels[indexChoice] || "";

                return (
                  <div key={indexChoice} className="flex items-center gap-3">
                    <div
                      className={`relative flex flex-1 cursor-pointer items-center gap-3 rounded-xl pl-4 pr-4 py-[10px] transition-all ${
                        isCrossed
                          ? "cursor-default bg-slate-50 ring-1 ring-inset ring-slate-200"
                          : isSelected
                            ? "bg-white ring-2 ring-inset ring-[#3056D3]"
                            : "bg-white ring-1 ring-inset ring-slate-400 hover:ring-slate-600"
                      }`}
                      onClick={() => !isCrossed && onAnswerSelect(question._id, storedChoiceCode)}
                    >
                      {isCrossed ? (
                        <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-10 h-[1.5px] bg-slate-500" />
                      ) : null}

                      <div
                        className={`flex h-[26px] w-[26px] shrink-0 select-none items-center justify-center rounded-full border text-[13px] font-semibold transition-all ${
                          isCrossed
                            ? "border-slate-300 bg-white text-slate-400"
                            : isSelected
                              ? "border-[#2B579A] bg-[#2B579A] text-white"
                              : "border-slate-500 bg-white text-slate-700"
                        }`}
                      >
                        {label}
                      </div>

                      <span className={`select-none text-[15px] leading-snug ${isCrossed ? "text-slate-400" : "text-slate-900"}`}>
                        <Latex>{choice || ""}</Latex>
                      </span>
                    </div>

                    {showElimination ? (
                      <button
                        onClick={(event) => toggleCrossOut(event, choice)}
                        title={isCrossed ? `Hoan tac loai tru dap an ${label}` : `Loai tru dap an ${label}`}
                        className="flex w-[30px] shrink-0 cursor-pointer items-center justify-center transition-all"
                      >
                        {isCrossed ? (
                          <span className="whitespace-nowrap text-[13px] font-semibold text-slate-600 underline hover:no-underline">
                            Undo
                          </span>
                        ) : (
                          <EliminationCircle label={label} />
                        )}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EliminationCircle({ label }: { label: string }) {
  return (
    <div className="relative flex h-[16px] w-[16px] items-center justify-center rounded-full border border-slate-500 text-slate-600 transition-colors hover:border-slate-800 hover:text-slate-800">
      <span className="mt-[1px] select-none text-[10px] font-medium leading-none">{label}</span>
      <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-current" />
    </div>
  );
}
