interface SkeletonProps {
  isSectional?: boolean;
}

export default function TestCardSkeleton({ isSectional = false }: SkeletonProps) {
  return (
    <div className="workbook-panel flex h-full flex-col overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-4 py-4">
        <div className="mb-4 h-5 w-24 animate-pulse rounded-full bg-surface-white" />
        <div className="h-8 w-3/4 animate-pulse rounded-md bg-surface-white/70" />
      </div>

      <div className="flex-1 space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-3">
            <div className="h-4 w-20 animate-pulse rounded-md bg-paper-bg" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded-md bg-surface-white" />
          </div>
          <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-3">
            <div className="h-4 w-24 animate-pulse rounded-md bg-paper-bg" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded-md bg-surface-white" />
          </div>
        </div>

        {isSectional ? (
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-paper-bg" />
            <div className="h-4 w-4/5 animate-pulse rounded-md bg-paper-bg" />
          </div>
        ) : null}
      </div>

      <div className="border-t-4 border-ink-fg bg-paper-bg p-4">
        {isSectional ? (
          <div className="space-y-3">
            <div className="h-12 w-full animate-pulse rounded-2xl border-2 border-ink-fg bg-surface-white" />
            <div className="h-12 w-full animate-pulse rounded-2xl border-2 border-ink-fg bg-surface-white" />
          </div>
        ) : (
          <div className="h-12 w-full animate-pulse rounded-2xl border-2 border-ink-fg bg-surface-white" />
        )}
      </div>
    </div>
  );
}
