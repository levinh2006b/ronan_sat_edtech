import type { ReactNode } from "react";
type PaginatedStickyTableShellProps = {
  children: ReactNode;
  pagination?: ReactNode;
  loading: boolean;
  hasRows: boolean;
  loadingLabel?: string;
  viewportClassName?: string;
};

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PaginatedStickyTableShell({
  children,
  pagination,
  loading,
  hasRows,
  loadingLabel = "Loading page",
  viewportClassName,
}: PaginatedStickyTableShellProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {pagination ? <div className="shrink-0 flex justify-end px-1">{pagination}</div> : null}

      <div
        className={joinClassNames(
          "relative min-w-0 rounded-2xl border-2 border-ink-fg bg-surface-white p-1",
          viewportClassName,
        )}
      >
        <div className="workbook-scrollbar min-w-0 overflow-x-auto overflow-y-visible rounded-[1.1rem]">
          <div className="min-w-full pr-4 pb-4">{children}</div>
        </div>

        {loading && hasRows ? <div className="pointer-events-none absolute inset-0 z-20 bg-surface-white/35" /> : null}
      </div>
    </section>
  );
}
