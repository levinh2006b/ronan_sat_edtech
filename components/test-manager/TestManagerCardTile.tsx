import Link from "next/link";
import { ArrowRight, FileWarning, GripVertical } from "lucide-react";

import type { TestManagerCard } from "@/components/test-manager/TestManagerBoardProvider";

type TestManagerCardTileProps = {
  card: TestManagerCard;
  draggable?: boolean;
  detailHref?: string;
  onDragStart?: (cardId: string) => void;
};

export function TestManagerCardTile({
  card,
  draggable = false,
  detailHref,
  onDragStart,
}: TestManagerCardTileProps) {
  return (
    <article
      draggable={draggable}
      onDragStart={() => onDragStart?.(card.id)}
      className="rounded-[18px] border-2 border-ink-fg bg-surface-white p-4 brutal-shadow-sm"
    >
      <div className="flex items-start gap-3">
        {draggable ? <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-ink-fg/35" /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 text-[14px] font-semibold leading-5 text-ink-fg">{card.text}</div>
            <span className="ml-auto inline-flex shrink-0 items-center rounded-full border-2 border-ink-fg bg-paper-bg px-2.5 py-0.5 text-[11px] font-semibold text-ink-fg">
              {card.reportCount} {card.reportCount === 1 ? "report" : "reports"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-fg/70">
            <span className="rounded-full border-2 border-ink-fg bg-paper-bg px-2 py-0.5">{card.section}</span>
            <span className="rounded-full border-2 border-ink-fg bg-paper-bg px-2 py-0.5">Module {card.module}</span>
            <span className="rounded-full border-2 border-ink-fg bg-paper-bg px-2 py-0.5">Question {card.questionNumber}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {detailHref ? (
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-fg bg-accent-2 px-3 py-1.5 text-[12px] font-semibold text-white transition workbook-press"
          >
            <FileWarning className="h-3.5 w-3.5" />
            Show detail
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
