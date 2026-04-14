"use client";

import { CSSProperties, useMemo, useState } from "react";
import { CldImage } from "next-cloudinary";
import Latex from "react-latex-next";
import { Bookmark } from "lucide-react";

import SelectableTextPanel, { type TextAnnotation } from "@/components/test/SelectableTextPanel";
import { getTestingRoomThemePreset, type TestingRoomTheme } from "@/lib/testingRoomTheme";
import { getChoiceCode } from "@/utils/gradingHelper";

const MAX_SPR_ANSWER_LENGTH = 200;

type ViewerQuestion = {
  _id: string;
  questionType?: string;
  questionText?: string;
  passage?: string;
  imageUrl?: string;
  choices?: string[];
};

interface QuestionViewerProps {
  theme?: TestingRoomTheme;
  question: ViewerQuestion;
  userAnswer: string;
  onAnswerSelect: (questionId: string, choice: string) => void;
  isFlagged: boolean;
  onToggleFlag: (questionId: string) => void;
  index: number;
  leftWidth?: number;
}

export default function QuestionViewer({
  theme = "ronan",
  question,
  userAnswer,
  onAnswerSelect,
  isFlagged,
  onToggleFlag,
  index,
  leftWidth = 50,
}: QuestionViewerProps) {
  const viewerTheme = getTestingRoomThemePreset(theme).viewer;
  const optionLabels = ["A", "B", "C", "D"];
  const [crossedOutByQuestion, setCrossedOutByQuestion] = useState<Record<string, string[]>>({});
  const [showEliminationByQuestion, setShowEliminationByQuestion] = useState<Record<string, boolean>>({});
  const [annotationsByQuestion, setAnnotationsByQuestion] = useState<
    Record<string, { passage: TextAnnotation[]; questionText: TextAnnotation[]; choices: Record<string, TextAnnotation[]> }>
  >({});

  const toggleCrossOut = (event: React.MouseEvent, choice: string) => {
    event.stopPropagation();
    setCrossedOutByQuestion((previous) => {
      const current = previous[question._id] ?? [];
      return {
        ...previous,
        [question._id]: current.includes(choice)
          ? current.filter((item) => item !== choice)
          : [...current, choice],
      };
    });
  };

  const hasLeftPanel = question.passage || question.imageUrl;
  const leftPct = `${leftWidth}%`;
  const rightPct = `${100 - leftWidth}%`;
  const splitPanelStyle =
    hasLeftPanel
      ? ({
          "--left-panel-width": leftPct,
          "--right-panel-width": rightPct,
        } as CSSProperties)
      : undefined;
  const currentAnnotations = useMemo(
    () =>
      annotationsByQuestion[question._id] ?? {
        passage: [],
        questionText: [],
        choices: {},
      },
    [annotationsByQuestion, question._id],
  );
  const crossedOut = crossedOutByQuestion[question._id] ?? [];
  const showElimination = showEliminationByQuestion[question._id] ?? false;
  const passageContent = useMemo(() => {
    if (!question.passage) {
      return null;
    }

    return <Latex>{question.passage}</Latex>;
  }, [question.passage]);
  const questionTextContent = useMemo(() => <Latex>{question.questionText ?? ""}</Latex>, [question.questionText]);

  const updateAnnotations = (part: "passage" | "questionText", nextAnnotations: TextAnnotation[]) => {
    setAnnotationsByQuestion((previous) => ({
      ...previous,
      [question._id]: {
        passage: previous[question._id]?.passage ?? [],
        questionText: previous[question._id]?.questionText ?? [],
        choices: previous[question._id]?.choices ?? {},
        [part]: nextAnnotations,
      },
    }));
  };

  const updateChoiceAnnotations = (choiceKey: string, nextAnnotations: TextAnnotation[]) => {
    setAnnotationsByQuestion((previous) => ({
      ...previous,
      [question._id]: {
        passage: previous[question._id]?.passage ?? [],
        questionText: previous[question._id]?.questionText ?? [],
        choices: {
          ...(previous[question._id]?.choices ?? {}),
          [choiceKey]: nextAnnotations,
        },
      },
    }));
  };

  const handleChoiceSelect = (questionId: string, choiceCode: string) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      return;
    }

    onAnswerSelect(questionId, choiceCode);
  };

  return (
    <div
      className={`mb-16 mt-14 flex h-[calc(100vh-7rem)] w-full flex-col overflow-hidden sm:mb-20 sm:mt-20 sm:h-[calc(100vh-10rem)] md:flex-row ${viewerTheme.rootClass}`}
      style={splitPanelStyle}
    >
      {hasLeftPanel ? (
        <div className={`hidden md:block md:h-full md:w-[var(--left-panel-width)] md:shrink-0 md:overflow-y-auto md:p-10 ${viewerTheme.leftPanelClass}`}>
          {question.imageUrl ? (
            <div className={`mb-4 flex w-full justify-center p-3 sm:mb-6 sm:p-4 ${viewerTheme.imageCardClass}`}>
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
            <SelectableTextPanel
              theme={theme}
              annotations={currentAnnotations.passage}
              onChange={(nextAnnotations) => updateAnnotations("passage", nextAnnotations)}
              className={`whitespace-pre-wrap p-4 text-[14px] leading-relaxed selection:text-black sm:p-6 sm:text-[15px] [font-family:Georgia,'Times_New_Roman',Times,serif] ${viewerTheme.passageClass}`}
              sourceQuestionId={question._id}
            >
              {passageContent}
            </SelectableTextPanel>
          ) : null}
        </div>
      ) : null}

      {hasLeftPanel ? (
        <div
          id="qv-divider"
          className={`group relative z-10 hidden flex-shrink-0 cursor-col-resize items-center justify-center transition-colors md:flex ${viewerTheme.dividerTrackClass}`}
          style={{ width: "4px" }}
        >
          <div
            className={`pointer-events-none absolute flex select-none items-center justify-center rounded-sm transition-colors ${viewerTheme.dividerHandleClass}`}
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
        className={`${hasLeftPanel ? "" : "mx-auto max-w-3xl"} flex min-h-0 w-full flex-1 flex-col overflow-y-auto md:w-[var(--right-panel-width)] md:flex-none`}
      >
        {hasLeftPanel ? (
          <div className={`px-4 pt-4 sm:px-6 md:hidden ${viewerTheme.leftPanelClass}`}>
            {question.imageUrl ? (
              <div className={`mb-4 flex w-full justify-center p-3 ${viewerTheme.imageCardClass}`}>
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
              <SelectableTextPanel
                annotations={currentAnnotations.passage}
                onChange={(nextAnnotations) => updateAnnotations("passage", nextAnnotations)}
                className={`whitespace-pre-wrap p-4 text-[14px] leading-relaxed selection:text-black [font-family:Georgia,'Times_New_Roman',Times,serif] ${viewerTheme.passageClass}`}
                sourceQuestionId={question._id}
              >
                {passageContent}
              </SelectableTextPanel>
            ) : null}
          </div>
        ) : null}

        <div className="shrink-0 px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
          <div className="flex h-[30px] items-stretch sm:h-[32px]">
            <div className={`flex w-[30px] shrink-0 select-none items-center justify-center text-sm font-black sm:w-[32px] ${viewerTheme.questionNumberClass}`}>
              {index + 1}
            </div>

            <div className={`flex flex-1 items-center justify-between gap-2 px-2.5 sm:px-3 ${viewerTheme.questionToolbarClass}`}>
              <button
                onClick={() => onToggleFlag(question._id)}
                className={`inline-flex min-w-0 select-none items-center gap-1 text-[12px] font-bold transition-all sm:gap-1.5 sm:text-[13px] ${
                  isFlagged ? viewerTheme.flagActiveClass : viewerTheme.flagDefaultClass
                }`}
              >
                <Bookmark className={`h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${isFlagged ? viewerTheme.flagIconActiveClass : ""}`} strokeWidth={1.9} />
                <span className="truncate">Mark for Review</span>
              </button>

              <button
                onClick={() =>
                  setShowEliminationByQuestion((previous) => ({
                    ...previous,
                    [question._id]: !(previous[question._id] ?? false),
                  }))
                }
                title={showElimination ? "Tat Process of Elimination" : "Bat Process of Elimination"}
                className={`relative flex h-6 w-6 items-center justify-center rounded-sm font-bold transition-colors select-none sm:h-[26px] sm:w-[26px] ${showElimination ? viewerTheme.eliminationActiveClass : viewerTheme.eliminationIdleClass}`}
              >
                <span className="relative z-10 text-[9px] tracking-[-0.08em] sm:text-[10px]">ABC</span>
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

          <div className={`mt-[2px] w-full ${viewerTheme.sectionRuleClass}`} />
        </div>

        <SelectableTextPanel
          theme={theme}
          annotations={currentAnnotations.questionText}
          onChange={(nextAnnotations) => updateAnnotations("questionText", nextAnnotations)}
          className={`mx-4 px-4 pb-4 pt-4 text-[14px] leading-relaxed sm:mx-6 sm:px-6 sm:text-[15px] [font-family:Georgia,'Times_New_Roman',Times,serif] ${viewerTheme.promptClass}`}
          sourceQuestionId={question._id}
        >
          {questionTextContent}
        </SelectableTextPanel>

        <div className="flex-1 px-4 pb-6 sm:px-6 sm:pb-8">
          {question.questionType === "spr" ? (
            <div className="mt-4">
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.14em] text-ink-fg sm:text-sm sm:tracking-[0.16em]">
                Student-Produced Response
              </label>
              <input
                type="text"
                value={userAnswer || ""}
                onChange={(event) => onAnswerSelect(question._id, event.target.value)}
                maxLength={MAX_SPR_ANSWER_LENGTH}
                placeholder="Enter your answer (e.g. 1/3, 0.5)"
                className={viewerTheme.sprInputClass}
              />
              <div className={`mt-2 flex max-w-sm items-center justify-between gap-3 text-xs sm:text-sm ${viewerTheme.sprMetaClass}`}>
                <p>You can enter a fraction, decimal, or integer.</p>
                <span className={`${(userAnswer || "").length >= MAX_SPR_ANSWER_LENGTH ? "text-amber-600" : ""}`}>
                  {(userAnswer || "").length}/{MAX_SPR_ANSWER_LENGTH}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5 sm:space-y-3">
              {question.choices?.map((choice: string, indexChoice: number) => {
                const storedChoiceCode = getChoiceCode(indexChoice);
                const isSelected = userAnswer === storedChoiceCode;
                const isCrossed = crossedOut.includes(choice);
                const label = optionLabels[indexChoice] || "";

                return (
                  <div key={indexChoice} className="flex items-center gap-2 sm:gap-3">
                    <div
                      className={`relative flex flex-1 cursor-pointer items-center gap-2.5 px-3 py-[10px] transition-all sm:gap-3 sm:px-4 ${
                        isCrossed
                          ? viewerTheme.answerCrossedClass
                        : isSelected
                            ? viewerTheme.answerSelectedClass
                          : viewerTheme.answerIdleClass
                        }`}
                      onClick={() => !isCrossed && handleChoiceSelect(question._id, storedChoiceCode)}
                    >
                      {isCrossed ? (
                        <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-10 h-[1.5px] bg-ink-fg" />
                      ) : null}

                        <div
                          className={`flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full text-[12px] font-black transition-all sm:h-[26px] sm:w-[26px] sm:text-[13px] ${
                             isCrossed
                              ? viewerTheme.optionBadgeCrossedClass
                              : isSelected
                               ? viewerTheme.optionBadgeSelectedClass
                               : viewerTheme.optionBadgeIdleClass
                          }`}
                        >
                          {label}
                      </div>

                      <SelectableTextPanel
                        theme={theme}
                        annotations={currentAnnotations.choices[storedChoiceCode] ?? []}
                        onChange={(nextAnnotations) => updateChoiceAnnotations(storedChoiceCode, nextAnnotations)}
                        className={`min-w-0 flex-1 text-[14px] leading-snug sm:text-[15px] [font-family:Georgia,'Times_New_Roman',Times,serif] ${
                          isCrossed ? viewerTheme.choiceCrossedTextClass : viewerTheme.choiceTextClass
                        }`}
                        sourceQuestionId={question._id}
                      >
                        <Latex>{choice || ""}</Latex>
                      </SelectableTextPanel>
                    </div>

                    {showElimination ? (
                      <button
                        onClick={(event) => toggleCrossOut(event, choice)}
                        title={isCrossed ? `Hoan tac loai tru dap an ${label}` : `Loai tru dap an ${label}`}
                        className="flex w-7 shrink-0 items-center justify-center transition-all sm:w-[30px]"
                      >
                        {isCrossed ? (
                          <span className="whitespace-nowrap text-[12px] font-semibold text-ink-fg underline hover:no-underline sm:text-[13px]">
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
    <div className="relative flex h-[16px] w-[16px] items-center justify-center rounded-full border-2 border-ink-fg text-ink-fg transition-colors">
      <span className="mt-[1px] select-none text-[10px] font-medium leading-none">{label}</span>
      <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-current" />
    </div>
  );
}
