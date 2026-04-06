"use client";

import { Dispatch, SetStateAction } from "react";
import { BookOpen } from "lucide-react";

import TestCard from "@/components/TestCard";
import TestCardSkeleton from "@/components/TestCardSkeleton";
import type { SortOption, TestListItem } from "@/types/testLibrary";

interface TestLibraryProps {
  uniquePeriods: string[];
  selectedPeriod: string;
  setSelectedPeriod: (val: string) => void;
  sortOption: SortOption;
  setSortOption: Dispatch<SetStateAction<SortOption>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  loading: boolean;
  syncing?: boolean;
  filteredTests: TestListItem[];
  totalPages: number;
}

export default function TestLibrary({
  uniquePeriods,
  selectedPeriod,
  setSelectedPeriod,
  sortOption,
  setSortOption,
  page,
  setPage,
  loading,
  syncing = false,
  filteredTests,
  totalPages,
}: TestLibraryProps) {
  return (
    <section>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-24">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
              Filter by Date
            </h2>
            <div className="flex flex-col gap-2">
              {uniquePeriods.map((period, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedPeriod(period);
                    setPage(1);
                  }}
                  className={`cursor-pointer text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {period === "All" ? "All Tests" : period}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full md:w-3/4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-transparent">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Practice Test Library</h2>
              {syncing && <span className="text-sm text-slate-500 animate-pulse">Syncing...</span>}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-tests" className="text-sm font-medium text-slate-600">
                Sort by:
              </label>
              <select
                id="sort-tests"
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value as SortOption);
                  setPage(1);
                }}
                className="cursor-pointer bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <TestCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No tests found for this period</h3>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTests.map((test) => (
                  <TestCard key={test._id} test={test} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-8 gap-4">
                  <button
                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
