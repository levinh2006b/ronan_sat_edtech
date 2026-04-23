"use client";

import QuestionExtraBlock from "@/components/question/QuestionExtraBlock";
import type { ReviewQuestion } from "@/types/review";
import { renderHtmlLatexContent } from "@/utils/renderContent";

interface PassageColumnProps {
  q: ReviewQuestion;
}

export default function PassageColumn({ q }: PassageColumnProps) {
  if (!q.passage) {
    return null;
  }

  return (
    <div className="h-full min-h-0 w-1/2 self-stretch overflow-y-auto border-r-4 border-ink-fg bg-paper-bg">
      <div className="p-8 lg:p-10">
        <QuestionExtraBlock
          extra={q.extra}
          className="mb-6 rounded-2xl border-2 border-ink-fg bg-surface-white p-4"
          titleClassName="mb-2 text-center font-sans text-[16px] font-normal leading-[1.35] text-ink-fg"
        />

        <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-6 font-[Georgia,serif] text-[16px] leading-[1.85] text-ink-fg selection:bg-primary brutal-shadow">
          {renderHtmlLatexContent(q.passage)}
        </div>
      </div>
    </div>
  );
}
