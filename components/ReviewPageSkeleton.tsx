"use client";

export default function ReviewPageSkeleton() {
  return (
    <div className="min-h-screen bg-paper-bg lg:flex">
      <aside className="hidden h-screen w-[22rem] shrink-0 border-r-4 border-ink-fg bg-surface-white lg:flex lg:flex-col">
        <div className="border-b-4 border-ink-fg bg-paper-bg px-4 py-5">
          <div className="h-8 w-32 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
          <div className="mt-4 h-10 w-40 rounded-md bg-surface-white/70 animate-pulse" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-12 rounded-2xl border-2 border-ink-fg bg-surface-white animate-pulse" />
            <div className="h-12 rounded-2xl border-2 border-ink-fg bg-surface-white animate-pulse" />
          </div>
        </div>

        <div className="bg-dot-pattern flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-4 brutal-shadow-sm">
              <div className="mb-2 h-4 w-4/5 rounded bg-paper-bg animate-pulse" />
              <div className="mb-3 h-3 w-1/2 rounded bg-paper-bg/70 animate-pulse" />
              <div className="ml-auto h-8 w-20 rounded-full border-2 border-ink-fg bg-paper-bg animate-pulse" />
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="h-8 w-36 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
            <div className="mt-4 h-12 w-4/5 rounded-md bg-surface-white/70 animate-pulse" />
            <div className="mt-3 h-6 w-3/5 rounded-md bg-surface-white animate-pulse" />
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-6">
          <div className="workbook-panel overflow-hidden">
            <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-8 w-2/3 rounded bg-surface-white/70 animate-pulse" />
                  <div className="h-3 w-40 rounded bg-surface-white animate-pulse" />
                </div>
                <div className="h-10 w-28 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t-2 border-ink-fg/15 pt-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-8 w-28 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {Array.from({ length: 2 }).map((_, section) => (
            <div key={section} className="workbook-panel overflow-hidden">
              <div className="border-b-4 border-ink-fg bg-paper-bg p-6">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-2xl border-2 border-ink-fg bg-surface-white animate-pulse" />
                  <div className="h-5 w-44 rounded bg-surface-white/70 animate-pulse" />
                </div>
              </div>
              <div className="space-y-6 p-6">
                {Array.from({ length: 2 }).map((_, moduleIndex) => (
                  <div key={moduleIndex}>
                    <div className="mb-3 flex items-center justify-between gap-4">
                       <div className="h-4 w-24 rounded bg-paper-bg animate-pulse" />
                       <div className="h-8 w-44 rounded-full border-2 border-ink-fg bg-paper-bg animate-pulse" />
                    </div>
                    <div className="mb-3 h-px bg-ink-fg/15" />
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 12 }).map((_, cell) => (
                         <div key={cell} className="h-10 w-10 rounded-2xl border-2 border-ink-fg bg-paper-bg animate-pulse" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
