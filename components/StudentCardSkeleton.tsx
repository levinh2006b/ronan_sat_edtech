"use client";

export default function StudentCardSkeleton() {
  return (
    <div className="workbook-panel flex h-full flex-col overflow-hidden">
      <div className="h-60 w-full animate-pulse border-b-4 border-ink-fg bg-paper-bg" />
      <div className="flex flex-1 flex-col p-5 text-center">
        <div className="mx-auto h-8 w-28 animate-pulse rounded-full border-2 border-ink-fg bg-surface-white" />
        <div className="mx-auto mt-4 h-7 w-2/3 animate-pulse rounded-md bg-paper-bg" />
        <div className="mx-auto mt-3 h-4 w-3/4 animate-pulse rounded-md bg-surface-white" />
        <div className="mt-5 h-24 animate-pulse rounded-2xl border-2 border-ink-fg bg-paper-bg" />
        <div className="mx-auto mt-4 h-4 w-28 animate-pulse rounded-md bg-surface-white" />
      </div>
    </div>
  );
}
