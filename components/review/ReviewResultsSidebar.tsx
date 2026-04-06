import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  Layers,
} from "lucide-react";

import type { ReviewResult } from "@/types/review";
import { getReviewScoreLabel } from "@/components/review/reviewPage.utils";

type ReviewResultsSidebarProps = {
  refreshing: boolean;
  testType: "full" | "sectional";
  activeTestId: string | null;
  filteredResults: ReviewResult[];
  onChangeType: (value: "full" | "sectional") => void;
  onSelectTest: (testId: string) => void;
};

export function ReviewResultsSidebar({
  refreshing,
  testType,
  activeTestId,
  filteredResults,
  onChangeType,
  onSelectTest,
}: ReviewResultsSidebarProps) {
  return (
    <aside className="sticky top-16 flex h-[calc(100vh-64px)] w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1.5">
            <LayoutGrid className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Review Mistakes</h2>
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => onChangeType("full")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              testType === "full" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="h-3 w-3" />
            FULL LENGTH
          </button>
          <button
            onClick={() => onChangeType("sectional")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              testType === "sectional" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardList className="h-3 w-3" />
            SECTIONAL
          </button>
        </div>
        {refreshing ? <div className="mt-3 animate-pulse text-xs text-slate-500">Syncing review...</div> : null}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {filteredResults.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-slate-400">No results found for this category.</p>
        ) : null}

        {filteredResults.map((result) => {
          const isActive = activeTestId === result._id;
          const scoreLabel = getReviewScoreLabel(result);

          return (
            <button
              key={result._id}
              onClick={() => onSelectTest(result._id)}
              className={`group flex w-full cursor-pointer items-start justify-between gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                isActive ? "border-blue-200 bg-blue-50" : "border-transparent hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                  {result.testId?.title}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  {new Date(result.date || result.createdAt || "").toLocaleDateString()}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                  {scoreLabel}
                </span>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-opacity ${
                    isActive ? "text-blue-400 opacity-60" : "text-slate-400 opacity-0 group-hover:opacity-40"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
