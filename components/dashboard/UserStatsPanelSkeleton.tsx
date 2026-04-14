"use client";

export default function UserStatsPanelSkeleton() {
  return (
    <section>
      <div className="mb-4">
        <div className="h-8 w-40 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
        <div className="mt-3 h-10 w-72 rounded-md bg-paper-bg animate-pulse" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-stretch">
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, cardIndex) => (
            <div key={cardIndex} className="workbook-panel grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-4 p-5">
              <div className="h-16 w-16 shrink-0 rounded-2xl border-2 border-ink-fg bg-paper-bg animate-pulse" />
              <div className="space-y-2 pt-1">
                <div className="h-4 w-28 rounded bg-paper-bg animate-pulse" />
                <div className="h-8 w-16 rounded bg-surface-white animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        <div className="workbook-panel grid h-full grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 p-5">
          <div className="h-16 w-16 shrink-0 rounded-2xl border-2 border-ink-fg bg-paper-bg animate-pulse" />
          <div className="space-y-2 pt-1">
            <div className="h-4 w-28 rounded bg-paper-bg animate-pulse" />
            <div className="h-8 w-28 rounded bg-surface-white animate-pulse" />
          </div>
          <div className="col-span-2 hidden rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-5 lg:grid lg:flex-1 lg:place-items-center">
            <div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1">
              {Array.from({ length: 30 }).map((_, index) => (
                <div key={index} className="aspect-square rounded-sm bg-paper-bg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
