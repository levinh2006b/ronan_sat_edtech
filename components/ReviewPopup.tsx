"use client";

import { useState } from "react";
import { X, Sparkles, Calculator, BookOpen, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import DesmosCalculator from "@/components/DesmosCalculator";
import ReviewChatbot from "@/components/ReviewChatbot";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";
import type { ReviewAnswer } from "@/types/review";

// Import các component con đã được tách
import PassageColumn from "@/components/review/PassageCollumn";
import AnswerDetails from "@/components/review/AnswerDetails";

interface ReviewPopupProps {
    ans: ReviewAnswer;
    onClose: () => void;
    expandedExplanation: string | undefined;
    loadingExplanation: boolean;
    onExpandExplanation: (qId: string) => void;
}

export default function ReviewPopup({ ans, onClose, expandedExplanation, loadingExplanation, onExpandExplanation }: ReviewPopupProps) {
    const q = ans?.questionId;

    const [showCalculator, setShowCalculator] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const [isExplanationVisible, setIsExplanationVisible] = useState(false);

    if (!q) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-slate-800 font-bold text-base">Question data is missing or corrupted.</p>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-900 text-white hover:bg-slate-700 rounded-lg font-medium transition text-sm">Close</button>
                </div>
            </div>
        );
    }

    const isMath = q?.subject?.toLowerCase() === "math" || q?.domain?.toLowerCase()?.includes("math");

    const handleToggleExplanation = () => {
        if (!isExplanationVisible && !expandedExplanation) {
            onExpandExplanation(q._id);
        }
        setIsExplanationVisible(!isExplanationVisible);
    };

  return (
    <div className="fixed inset-0 z-[100] bg-[#f5f7fa] flex flex-col">

        <DesmosCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />

        {/* ── Header ── */}
        <header className="h-16 bg-white border-b-2 border-[#1a4080] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
            {/* Left */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#1a4080]">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="2" width="14" height="2" rx="1" fill="white"/>
                            <rect x="1" y="7" width="9" height="2" rx="1" fill="white"/>
                            <rect x="1" y="12" width="11" height="2" rx="1" fill="white"/>
                        </svg>
                    </div>
                    <span className="font-bold text-[#1a4080] text-sm tracking-wide uppercase letter-spacing-widest">Review Question</span>
                </div>
                {q.domain && (
                    <span className="text-xs bg-[#e8eef7] text-[#1a4080] px-3 py-1 rounded-full border border-[#c2d0e8] font-semibold">
                        {q.domain}
                    </span>
                )}
                {isMath && (
                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                            showCalculator
                                ? "bg-[#1a4080] text-white border-[#1a4080] shadow-md"
                                : "bg-white text-[#1a4080] hover:bg-[#e8eef7] border-[#c2d0e8]"
                        }`}
                    >
                        <Calculator className="w-3.5 h-3.5" /> Desmos
                    </button>
                )}
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handleToggleExplanation}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                        isExplanationVisible
                            ? "bg-[#1a4080] text-white border-[#1a4080] shadow-md"
                            : "bg-white text-[#1a4080] hover:bg-[#e8eef7] border-[#c2d0e8]"
                    }`}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    {loadingExplanation ? "Loading..." : "Explanation"}
                    {isExplanationVisible ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                </button>

                <button
                    onClick={() => setShowAI(!showAI)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                        showAI
                            ? "bg-[#4338ca] text-white border-[#4338ca] shadow-md"
                            : "bg-white text-[#4338ca] hover:bg-[#ede9fe] border-[#c4b5fd]"
                    }`}
                >
                    <Sparkles className="w-3.5 h-3.5" /> Ask AI Tutor
                </button>

                <div className="w-px h-5 bg-[#c2d0e8] mx-1" />

                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-[#64748b] hover:text-red-600 rounded-md text-xs font-semibold transition-all border border-[#c2d0e8] hover:border-red-300"
                >
                    <X className="w-3.5 h-3.5" /> Close
                </button>
            </div>
        </header>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex relative">
            <div className="flex-1 flex h-full overflow-hidden">

                {/* ── Passage column ── */}
                <PassageColumn q={q} />

                {/* ── Question + Choices column ── */}
                <div className={`${q.passage ? "w-1/2" : "w-full max-w-3xl mx-auto"} h-full overflow-y-auto bg-[#f5f7fa]`}>
                    <div className="p-8 lg:p-10 flex flex-col gap-5">

                        {/* Image (no passage case) */}
                        {!q.passage && q.imageUrl && (
                            <div className="flex justify-center bg-white p-4 rounded-xl border border-[#dde5f0] shadow-sm">
                                <img src={q.imageUrl} alt="Reference" className="max-w-full max-h-[320px] object-contain rounded-lg" />
                            </div>
                        )}

                        {/* Question text card */}
                        <div className="bg-white rounded-xl border border-[#dde5f0] shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-5 bg-[#1a4080] rounded-full" />
                                <span className="text-[10px] font-bold text-[#1a4080] uppercase tracking-[0.15em]">Question</span>
                            </div>
                            <p className="text-[17px] text-[#1a2540] leading-relaxed font-medium">
                                <Latex>{q.questionText || ""}</Latex>
                            </p>
                        </div>

                        {/* Answer section (Tách thành file riêng) */}
                        <AnswerDetails q={q} ans={ans} />

                        {/* Explanation panel */}
                        {isExplanationVisible && (
                            <div className="bg-white rounded-xl border border-[#c2d0e8] shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#1a4080] border-b border-[#15336a]">
                                    <BookOpen className="w-4 h-4 text-blue-200" />
                                    <span className="font-bold text-sm text-white tracking-wide">Explanation</span>
                                </div>
                                <div className="p-6">
                                    {expandedExplanation ? (
                                        <p className="text-[#334155] leading-relaxed text-[15px] whitespace-pre-wrap">
                                            <Latex>{expandedExplanation || ""}</Latex>
                                        </p>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
                                            <div className="w-4 h-4 border-2 border-[#dde5f0] border-t-[#1a4080] rounded-full animate-spin" />
                                            Loading explanation...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── AI Tutor panel ── */}
            {showAI && (
                <div className="w-[420px] border-l border-[#dde5f0] bg-white flex flex-col shrink-0 shadow-2xl z-20">
                    <div className="bg-[#4338ca] px-4 py-3 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-[#4f46e5] rounded-lg">
                                <Sparkles className="w-4 h-4 text-indigo-200" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">AI Study Tutor</p>
                                <p className="text-xs text-indigo-300">Powered by Gemini</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAI(false)}
                            className="p-1.5 hover:bg-[#4f46e5] rounded-lg transition"
                        >
                            <X className="w-4 h-4 text-indigo-200" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-[#f5f7fa]">
                        <ReviewChatbot questionId={q._id} questionText={q.questionText || ""} headless />
                    </div>
                </div>
            )}
        </div>
    </div>
);
}
