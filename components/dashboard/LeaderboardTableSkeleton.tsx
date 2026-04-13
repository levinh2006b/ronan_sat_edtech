"use client";

export default function LeaderboardTableSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl border-2 border-ink-fg bg-surface-white animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-72 rounded-md bg-paper-bg animate-pulse" />
          <div className="h-4 w-48 rounded bg-surface-white animate-pulse" />
        </div>
      </div>

      <div className="workbook-table overflow-hidden">
        <div className="border-b-4 border-ink-fg bg-primary px-6 py-4">
          <div className="grid grid-cols-[96px_1fr_160px_160px] gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-4 rounded bg-paper-bg animate-pulse" />
            ))}
          </div>
        </div>
        <div>
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid grid-cols-[96px_1fr_160px_160px] items-center gap-4 border-b-2 border-ink-fg/10 px-6 py-4">
               <div className="h-5 w-12 rounded bg-paper-bg animate-pulse" />
               <div className="h-5 w-40 rounded bg-paper-bg animate-pulse" />
               <div className="h-5 w-20 justify-self-center rounded bg-paper-bg animate-pulse" />
               <div className="h-5 w-20 justify-self-center rounded bg-paper-bg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
