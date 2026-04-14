import { BookOpen } from "lucide-react";

import TestCard from "@/components/TestCard";
import TestCardSkeleton from "@/components/TestCardSkeleton";
import { LibraryFilterSidebar } from "@/components/dashboard/LibraryFilterSidebar";
import { LibraryHeader } from "@/components/dashboard/LibraryHeader";
import { LibraryPagination } from "@/components/dashboard/LibraryPagination";
import { LibrarySelect } from "@/components/dashboard/LibrarySelect";
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
  moduleFilter: "reading" | "math";
  setModuleFilter: (value: "reading" | "math") => void;
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
  moduleFilter,
  setModuleFilter,
  userResults,
}: SectionalTestLibraryProps) {
  const accentClassName = "bg-accent-2 text-white";

  return (
    <section className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <LibraryFilterSidebar
        title="Date"
        accentClassName={accentClassName}
        options={uniquePeriods}
        selectedValue={selectedPeriod}
        allLabel="All drills"
        onSelect={(period) => {
          setSelectedPeriod(period);
          setPage(1);
        }}
      />

      <div className="space-y-6">
        <LibraryHeader
          title="Sectional Practice Library"
          description="Target one module at a time."
          accentClassName={accentClassName}
          stickerLabel={moduleFilter === "reading" ? "Verbal Modules" : "Math Modules"}
          syncing={syncing}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">Module</label>
              <LibrarySelect
                value={moduleFilter}
                onValueChange={(value) => setModuleFilter(value as "reading" | "math")}
                className="min-w-[15rem]"
                options={[
                  { value: "reading", label: "Verbal" },
                  { value: "math", label: "Math" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">Sort</label>
              <LibrarySelect
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
                {[...Array(6)].map((_, index) => (
                  <TestCardSkeleton key={index} isSectional />
                ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="workbook-panel-muted py-16 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-ink-fg/45" />
              <h3 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg">No drills here yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-fg">
                Switch the module or date tab to pull a different practice stack into view.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredTests.map((test) => (
                  <TestCard
                    key={test._id}
                    test={test}
                    isSectional
                    moduleFilter={moduleFilter}
                    userResults={userResults}
                  />
                ))}
              </div>

              <LibraryPagination
                page={page}
                totalPages={totalPages}
                onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
