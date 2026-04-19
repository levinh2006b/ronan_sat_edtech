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
    <div className="h-full w-1/2 overflow-y-auto border-r-4 border-ink-fg bg-surface-white">
      <div className="p-8 lg:p-10">
        <QuestionExtraBlock
          extra={q.extra}
          className="mb-6 rounded-2xl border-2 border-ink-fg bg-surface-white p-4"
          titleClassName="mb-2 text-center text-[16px] font-normal leading-[1.35] text-ink-fg font-[Georgia,serif]"
        />

        <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-6 text-[16px] leading-[1.85] text-ink-fg selection:bg-primary">
          {renderHtmlLatexContent(q.passage)}
        </div>
      </div>
    </div>
  );
}
