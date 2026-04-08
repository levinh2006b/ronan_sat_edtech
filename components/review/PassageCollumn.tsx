"use client";

import Latex from 'react-latex-next';
import type { ReviewQuestion } from "@/types/review";

interface PassageColumnProps {
    q: ReviewQuestion;
}

export default function PassageColumn({ q }: PassageColumnProps) {
    // Nếu câu hỏi không có passage thì không render (vẽ) cột này ra màn hình
    if (!q.passage) return null;

    return (
        <div className="w-1/2 h-full overflow-y-auto bg-white border-r border-slate-200">
            <div className="p-8 lg:p-10">
                {q.imageUrl && (
                    <div className="flex justify-center bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <img src={q.imageUrl} alt="Reference" className="max-w-full max-h-[320px] object-contain rounded-lg shadow-sm" />
                    </div>
                )}
                {/* Passage label */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-slate-300 rounded-full" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Passage</span>
                </div>
                <div className="text-[16px] leading-[1.85] font-[Georgia,serif] text-slate-800 selection:bg-blue-100">
                    <Latex>{q.passage.replace(/\n/g, "<br/>")}</Latex>
                </div>
            </div>
        </div>
    );
}
