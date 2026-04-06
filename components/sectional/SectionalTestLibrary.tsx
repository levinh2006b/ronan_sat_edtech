import { BookOpen } from "lucide-react";

import TestCard from "@/components/TestCard";
import TestCardSkeleton from "@/components/TestCardSkeleton";
import type { SortOption, TestListItem, UserResultSummary } from "@/types/testLibrary";

type SectionalTestLibraryProps = {
  uniquePeriods: string[];
  selectedPeriod: string;
  setSelectedPeriod: (value: string) => void;
  sortOption: SortOption;
  setSortOption: React.Dispatch<React.SetStateAction<SortOption>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  syncing: boolean;
  filteredTests: TestListItem[];
  totalPages: number;
  subjectFilter: "reading" | "math";
  setSubjectFilter: (value: "reading" | "math") => void;
  userResults: UserResultSummary[];
};

export function SectionalTestLibrary({
  uniquePeriods,
  selectedPeriod,
  setSelectedPeriod,
  sortOption,
  setSortOption,
  page,
  setPage,
  loading,
  syncing,
  filteredTests,
  totalPages,
  subjectFilter,
  setSubjectFilter,
  userResults,
}: SectionalTestLibraryProps) {
  return (
    <section>
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="w-full flex-shrink-0 md:w-1/4">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold text-slate-800">Filter by Date</h2>
            <div className="flex flex-col gap-2">
              {uniquePeriods.map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setSelectedPeriod(period);
                    setPage(1);
                  }}
                  className={`text-left text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? "rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-blue-700 shadow-sm"
                      : "rounded-lg border border-transparent px-4 py-2.5 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {period === "All" ? "All Tests" : period}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full md:w-3/4">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-transparent sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Test Library</h2>
              {syncing ? <span className="animate-pulse text-sm text-slate-500">Syncing...</span> : null}
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Subject:</label>
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value as "reading" | "math")}
                  className="block rounded-lg border border-blue-200 bg-blue-50 p-2 text-sm font-semibold text-blue-700 outline-none focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="reading">Reading & Writing</option>
                  <option value="math">Math</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Sort by:</label>
                <select
                  value={sortOption}
                  onChange={(event) => {
                    setSortOption(event.target.value as SortOption);
                    setPage(1);
                  }}
                  className="block rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="title_desc">Title (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <TestCardSkeleton key={index} isSectional />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">No tests found</h3>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredTests.map((test) => (
                  <TestCard
                    key={test._id}
                    test={test}
                    isSectional
                    subjectFilter={subjectFilter}
                    userResults={userResults}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
