"use client";

import { Dispatch, SetStateAction } from "react";
import { BookOpen } from "lucide-react";

import TestCard from "@/components/TestCard";
import TestCardSkeleton from "@/components/TestCardSkeleton";
import { LibraryFilterSidebar } from "@/components/dashboard/LibraryFilterSidebar";
import { LibraryHeader } from "@/components/dashboard/LibraryHeader";
import { LibraryPagination } from "@/components/dashboard/LibraryPagination";
import { LibrarySelect } from "@/components/dashboard/LibrarySelect";
import type { SortOption, TestListItem, UserResultSummary } from "@/types/testLibrary";

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
  userResults: UserResultSummary[];
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
  userResults,
}: TestLibraryProps) {
  return (
    <section className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <LibraryFilterSidebar
        title="Date"
        accentClassName="bg-primary text-ink-fg"
        options={uniquePeriods}
        selectedValue={selectedPeriod}
        allLabel="All tests"
        onSelect={(period) => {
          setSelectedPeriod(period);
          setPage(1);
        }}
      />

      <div className="space-y-6">
        <LibraryHeader
          title="Practice Test Library"
          description="Browse every full-length exam in one shelf."
          accentClassName="bg-primary text-ink-fg"
          stickerLabel="Full-Length Shelf"
          syncing={syncing}
        >
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="sort-tests" className="text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
                Sort
              </label>
              <LibrarySelect
                id="sort-tests"
                value={sortOption}
                onValueChange={(value) => {
                  setSortOption(value as SortOption);
                  setPage(1);
                }}
                className="min-w-[15rem]"
                options={[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "title_asc", label: "Title (A-Z)" },
                  { value: "title_desc", label: "Title (Z-A)" },
                ]}
              />
            </div>
          </div>
        </LibraryHeader>

        <div>
          {loading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <TestCardSkeleton key={index} />
                ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="workbook-panel-muted py-16 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-ink-fg/45" />
              <h3 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg">No tests on this tab</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-fg">
                Try another date filter to pull a different workbook stack into view.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredTests.map((test) => (
                  <TestCard key={test._id} test={test} userResults={userResults} />
                ))}
              </div>

              <LibraryPagination
                page={page}
                totalPages={totalPages}
                onPrevious={() => setPage((currentPage: number) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage: number) => Math.min(totalPages, currentPage + 1))}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
