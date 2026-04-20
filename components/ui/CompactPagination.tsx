import { ChevronLeft, ChevronRight } from "lucide-react";

type CompactPaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

type PaginationItem = number | "ellipsis";

function getPaginationItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (page >= totalPages - 1) {
    return [totalPages - 3, totalPages - 2, totalPages - 1, totalPages].filter((item, index, items) => item > 0 && items.indexOf(item) === index);
  }

  return [page - 2, page - 1, page, "ellipsis", totalPages];
}

export function CompactPagination({ page, totalPages, onChange }: CompactPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink-fg bg-surface-white text-ink-fg transition-all active:bg-paper-bg disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {getPaginationItems(page, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm font-black uppercase tracking-[0.14em] text-ink-fg/55">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={[
              "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border-2 px-3 text-sm font-black uppercase tracking-[0.14em] transition-all",
              item === page
                ? "border-ink-fg bg-primary text-ink-fg"
                : "border-ink-fg bg-surface-white text-ink-fg/80",
            ].join(" ")}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink-fg bg-surface-white text-ink-fg transition-all active:bg-paper-bg disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
