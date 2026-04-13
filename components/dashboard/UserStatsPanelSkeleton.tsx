"use client";

export default function UserStatsPanelSkeleton() {
  return (
    <section>
      <div className="mb-4">
        <div className="h-8 w-40 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
        <div className="mt-3 h-10 w-72 rounded-md bg-paper-bg animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, cardIndex) => (
          <div key={cardIndex} className="workbook-panel p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl border-2 border-ink-fg bg-paper-bg animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-paper-bg animate-pulse" />
                <div className="h-8 w-16 rounded bg-surface-white animate-pulse" />
              </div>
            </div>
            {cardIndex === 1 ? (
              <div className="mt-5 grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1">
                {Array.from({ length: 30 }).map((_, index) => (
                  <div key={index} className="aspect-square rounded-sm bg-paper-bg animate-pulse" />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
