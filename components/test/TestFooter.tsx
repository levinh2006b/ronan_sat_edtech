"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, MapPin, X } from "lucide-react";

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
    questions
}: TestFooterProps) {
    const [isGridOpen, setIsGridOpen] = useState(false);
    const footerTheme = getTestingRoomThemePreset(theme).footer;
    const headerTitle = moduleName ?? "Question Navigator";
    const displayName = typeof window === "undefined"
        ? "Practice Test"
        : sessionStorage.getItem("testName") || "Practice Test";

    return (
        <>
            {isGridOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-ink-fg/20"
                        onClick={() => setIsGridOpen(false)}
                    />

                    <div className={`fixed bottom-[84px] left-1/2 z-40 w-[min(92vw,595px)] -translate-x-1/2 px-6 pb-7 pt-5 transition-all animate-in fade-in zoom-in-95 duration-200 ${footerTheme.modalClass}`}>
                        <div className={`flex items-start justify-between gap-4 pb-4 ${footerTheme.modalHeaderClass}`}>
                            <div className="w-8 shrink-0" />
                            <h3 className={`flex-1 text-center text-[22px] leading-[1.05] tracking-tight ${footerTheme.modalTitleClass}`}>
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

                        <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 text-[12px] font-medium ${footerTheme.modalLegendClass}`}>
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

                        <div className="mx-auto mt-4 flex max-h-[196px] w-full max-w-[500px] flex-wrap justify-start gap-x-[14px] gap-y-[18px] overflow-y-auto px-1 pb-1 pt-5">                            {questions.map((q, i) => {
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
                                        className={`relative flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-visible text-[14px] font-semibold transition-all ${
                                            isAnswered
                                                ? footerTheme.gridAnsweredClass
                                                : footerTheme.gridUnansweredClass
                                        }`}
                                        aria-label={`Jump to question ${i + 1}`}
                                    >
                                        {isCurrent ? (
                                            <MapPin className={`pointer-events-none absolute -top-[18px] left-1/2 h-4 w-4 -translate-x-1/2 ${footerTheme.currentPinClass}`} strokeWidth={2} />
                                        ) : null}
                                        <span>{i + 1}</span>
                                        {isFlagged ? (
                                            <div className="pointer-events-none absolute -right-[3px] -top-[6px]">
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
                                onClick={() => setIsGridOpen(false)}
                                className={footerTheme.modalActionButtonClass}
                            >
                                Go to Review Page
                            </button>
                        </div>
                    </div>
                </>
            )}

            <footer className={`fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-between px-4 sm:px-6 ${footerTheme.barClass}`}>

                <div className="flex-1">
                    <span suppressHydrationWarning className={`text-sm font-semibold sm:text-base ${footerTheme.displayNameClass}`}>
                        {displayName}
                    </span>
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <button
                        type="button"
                        onClick={() => setIsGridOpen(!isGridOpen)}
                        className={footerTheme.navigatorButtonClass}
                    >
                        <span>Question {currentIndex + 1} of {totalQuestions}</span>
                        <ChevronDown className={`ml-2 inline-block h-4 w-4 transition-transform ${isGridOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>

                <div className="flex flex-1 items-center justify-end gap-3">
                    {currentIndex > 0 && (
                        <button
                            type="button"
                            onClick={onPrev}
                            className={footerTheme.secondaryNavButtonClass}
                        >
                            Back
                        </button>
                    )}

                    {currentIndex < totalQuestions - 1 && (
                        <button
                            type="button"
                            onClick={onNext}
                            className={footerTheme.primaryNavButtonClass}
                        >
                            Next
                        </button>
                    )}
                </div>
            </footer>
        </>
    );
}
