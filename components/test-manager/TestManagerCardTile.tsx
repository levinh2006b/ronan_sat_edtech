import Link from "next/link";
import { Check, Trash2 } from "lucide-react";

import type { TestManagerCard } from "@/lib/testManagerReports";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { writeTestManagerQuestionCache } from "@/lib/testManagerQuestionCache";

const prefetchedDetailHrefs = new Set<string>();

async function prefetchDetail(detailHref: string) {
  if (prefetchedDetailHrefs.has(detailHref)) {
    return;
  }

  const match = detailHref.match(/\/test-manager\/questions\/([^/?#]+)/);
  const cardId = match?.[1];
  if (!cardId) {
    return;
  }

  prefetchedDetailHrefs.add(detailHref);

  try {
    const response = await api.get(API_PATHS.getTestManagerQuestion(cardId));
    writeTestManagerQuestionCache(cardId, response.data);
  } catch {
    prefetchedDetailHrefs.delete(detailHref);
  }
}

type TestManagerCardTileProps = {
  card: TestManagerCard;
  detailHref?: string;
  resolving?: boolean;
  deleting?: boolean;
  onResolve?: (questionId: string) => void;
  onDelete?: (questionId: string) => void;
};

export function TestManagerCardTile({ card, detailHref, resolving = false, deleting = false, onResolve, onDelete }: TestManagerCardTileProps) {
  return (
    <article
      className={`group flex items-center gap-3 rounded-2xl border-2 border-ink-fg px-4 py-3 transition ${
        card.isResolved ? "bg-paper-bg opacity-70" : "bg-surface-white hover:bg-paper-bg"
      }`}
    >
      <div className="min-w-0 flex-1">
        {detailHref ? (
          <Link
            href={detailHref}
            prefetch
            onMouseEnter={() => void prefetchDetail(detailHref)}
            onFocus={() => void prefetchDetail(detailHref)}
            className="block rounded-xl focus:outline-none focus-visible:brutal-shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`truncate text-[14px] font-semibold leading-5 text-ink-fg ${card.isResolved ? "line-through" : ""}`}>{card.text}</div>
                  <span className="inline-flex shrink-0 items-center rounded-full border-2 border-ink-fg bg-paper-bg px-2.5 py-0.5 text-[11px] font-semibold text-ink-fg">
                    {card.reportCount} {card.reportCount === 1 ? "report" : "reports"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-fg/70">
                  <span>{card.section}</span>
                  <span>Module {card.module}</span>
                  <span>Question {card.questionNumber}</span>
                  {card.isResolved ? <span className="font-semibold uppercase tracking-[0.08em]">Resolved</span> : null}
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className={`truncate text-[14px] font-semibold leading-5 text-ink-fg ${card.isResolved ? "line-through" : ""}`}>{card.text}</div>
                <span className="inline-flex shrink-0 items-center rounded-full border-2 border-ink-fg bg-paper-bg px-2.5 py-0.5 text-[11px] font-semibold text-ink-fg">
                  {card.reportCount} {card.reportCount === 1 ? "report" : "reports"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-fg/70">
                <span>{card.section}</span>
                <span>Module {card.module}</span>
                <span>Question {card.questionNumber}</span>
                {card.isResolved ? <span className="font-semibold uppercase tracking-[0.08em]">Resolved</span> : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex w-[84px] shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          disabled={resolving || deleting}
          aria-label={card.isResolved ? "Mark report unresolved" : "Mark report resolved"}
          onClick={() => onResolve?.(card.questionId)}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-fg opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-default disabled:opacity-0 disabled:group-focus-within:opacity-0 ${
            card.isResolved ? "bg-primary text-ink-fg" : "bg-surface-white text-ink-fg"
          }`}
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={resolving || deleting}
          aria-label="Delete report"
          onClick={() => onDelete?.(card.questionId)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-fg bg-accent-3 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-default disabled:opacity-0 disabled:group-focus-within:opacity-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
