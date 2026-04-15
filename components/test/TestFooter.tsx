"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, ChevronDown, MapPin, X } from "lucide-react";

import { getTestingRoomThemePreset, type TestingRoomTheme } from "@/lib/testingRoomTheme";

interface TestFooterProps {
    theme?: TestingRoomTheme;
    moduleName?: string;
    currentIndex: number;
    totalQuestions: number;
    onNext: () => void;
    onPrev: () => void;
    onJump: (index: number) => void;
    answers: Record<string, string>;
    flagged: Record<string, boolean>;
    questions: Array<{ _id: string }>;
    onOpenReviewPage: () => void;
}

export default function TestFooter({
    theme = "ronan",
    moduleName,
    currentIndex,
    totalQuestions,
    onNext,
    onPrev,
    onJump,
    answers,
    flagged,
    questions,
    onOpenReviewPage
}: TestFooterProps) {
    const [isGridOpen, setIsGridOpen] = useState(false);
    const footerTheme = getTestingRoomThemePreset(theme).footer;
    const headerTitle = moduleName ?? "Question Navigator";
    const displayName = "Ronan SAT";

    return (
        <>
            {isGridOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-ink-fg/20"
                        onClick={() => setIsGridOpen(false)}
                    />

                    <div className={`fixed bottom-[82px] left-1/2 z-40 w-[min(94vw,595px)] -translate-x-1/2 px-4 pb-5 pt-4 transition-all animate-in fade-in zoom-in-95 duration-200 sm:bottom-[98px] sm:px-6 sm:pb-7 sm:pt-5 ${footerTheme.modalClass}`}>
                        <div className={`flex items-start justify-between gap-4 pb-4 ${footerTheme.modalHeaderClass}`}>
                            <div className="w-8 shrink-0" />
                            <h3 className={`flex-1 text-center text-lg leading-[1.05] tracking-tight sm:text-[22px] ${footerTheme.modalTitleClass}`}>
                                {headerTitle}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsGridOpen(false)}
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${footerTheme.modalCloseButtonClass}`}
                                aria-label="Close question navigator"
                            >
                                <X className="h-4 w-4" strokeWidth={2} />
                            </button>
                        </div>

                        <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-3 text-[11px] font-medium sm:gap-x-6 sm:text-[12px] ${footerTheme.modalLegendClass}`}>
                            <div className="flex items-center gap-1.5">
                                <MapPin className={`h-4 w-4 ${footerTheme.currentPinClass}`} strokeWidth={2} />
                                <span>Current</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className={`h-4 w-4 bg-surface-white ${footerTheme.unansweredLegendClass}`} />
                                <span>Unanswered</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Bookmark className="h-3 w-3 fill-current text-accent-3" strokeWidth={1.9} />
                                <span>For Review</span>
                            </div>
                        </div>

                        <div className="mx-auto mt-4 flex max-h-[196px] w-full max-w-[500px] flex-wrap justify-start gap-x-3 gap-y-4 overflow-y-auto px-1 pb-1 pt-4 sm:gap-x-[14px] sm:gap-y-[18px] sm:pt-5">
                            {questions.map((q, i) => {
                                const isAnswered = !!answers[q._id];
                                const isFlagged = !!flagged[q._id];
                                const isCurrent = i === currentIndex;

                                return (
                                    <button
                                        key={q._id}
                                        type="button"
                                        onClick={() => {
                                            onJump(i);
                                            setIsGridOpen(false);
                                        }}
                                        className={`relative flex h-7 w-7 shrink-0 items-center justify-center overflow-visible text-[13px] font-semibold transition-all sm:h-[30px] sm:w-[30px] sm:text-[14px] ${
                                            isAnswered
                                                ? footerTheme.gridAnsweredClass
                                                : footerTheme.gridUnansweredClass
                                        }`}
                                        aria-label={`Jump to question ${i + 1}`}
                                    >
                                        {isCurrent ? (
                                            <MapPin className={`pointer-events-none absolute -top-4 left-1/2 h-3.5 w-3.5 -translate-x-1/2 sm:-top-[18px] sm:h-4 sm:w-4 ${footerTheme.currentPinClass}`} strokeWidth={2} />
                                        ) : null}
                                        <span>{i + 1}</span>
                                        {isFlagged ? (
                                            <div className="pointer-events-none absolute -right-[3px] -top-[5px] sm:-top-[6px]">
                                                <Bookmark className="h-3 w-3 fill-current text-accent-3" strokeWidth={1.9} />
                                            </div>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsGridOpen(false);
                                    onOpenReviewPage();
                                }}
                                className={footerTheme.modalActionButtonClass}
                            >
                                Go to Review Page
                            </button>
                        </div>
                    </div>
                </>
            )}

            <footer className={`fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between gap-2 px-3 sm:h-20 sm:px-6 ${footerTheme.barClass}`}>

                <div className="hidden min-w-0 flex-1 sm:block">
                    <span suppressHydrationWarning className={`hidden max-w-[7rem] truncate text-xs font-semibold sm:block sm:max-w-none sm:text-base ${footerTheme.displayNameClass}`}>
                        {displayName}
                    </span>
                </div>

                <div className="flex flex-1 items-center justify-start sm:justify-center">
                    <button
                        type="button"
                        onClick={() => setIsGridOpen(!isGridOpen)}
                        className={`${footerTheme.navigatorButtonClass} inline-flex max-w-full justify-center px-3 py-1.5 text-xs sm:w-auto sm:max-w-none sm:px-4 sm:py-2 sm:text-sm`}
                    >
                        <span className="sm:hidden">{currentIndex + 1}/{totalQuestions}</span>
                        <span className="hidden sm:inline">Question {currentIndex + 1} of {totalQuestions}</span>
                        <ChevronDown className={`ml-1.5 inline-block h-3.5 w-3.5 transition-transform sm:ml-2 sm:h-4 sm:w-4 ${isGridOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>

                <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
                    {currentIndex > 0 && (
                        <button
                            type="button"
                            onClick={onPrev}
                            className={`${footerTheme.secondaryNavButtonClass} px-3 py-1.5 text-xs sm:px-6 sm:text-sm`}
                            aria-label="Previous question"
                        >
                            <ArrowLeft className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Back</span>
                        </button>
                    )}

                    {currentIndex < totalQuestions - 1 && (
                        <button
                            type="button"
                            onClick={onNext}
                            className={`${footerTheme.primaryNavButtonClass} px-3 py-1.5 text-xs sm:px-6 sm:text-sm`}
                            aria-label="Next question"
                        >
                            <ArrowRight className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Next</span>
                        </button>
                    )}
                </div>
            </footer>
        </>
    );
}
