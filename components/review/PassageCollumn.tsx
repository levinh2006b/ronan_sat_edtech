"use client";

import Image from "next/image";
import Latex from "react-latex-next";

import type { ReviewQuestion } from "@/types/review";

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
        {q.imageUrl ? (
          <div className="mb-6 flex justify-center rounded-2xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm">
            <Image
              src={q.imageUrl}
              alt="Reference"
              width={1200}
              height={800}
              unoptimized
              className="max-h-[320px] max-w-full rounded-lg object-contain"
            />
          </div>
        ) : null}

        <div className="workbook-sticker bg-accent-1 text-ink-fg">Passage</div>
        <div className="mt-5 rounded-2xl border-2 border-ink-fg bg-paper-bg p-6 text-[16px] leading-[1.85] text-ink-fg selection:bg-primary">
          <Latex>{q.passage.replace(/\n/g, "<br/>")}</Latex>
        </div>
      </div>
    </div>
  );
}
