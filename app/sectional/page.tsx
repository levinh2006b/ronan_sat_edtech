"use client";

import Loading from "@/components/Loading";
import { SectionalTestLibrary } from "@/components/sectional/SectionalTestLibrary";
import { useSectionalTestsController } from "@/components/sectional/useSectionalTestsController";

export default function SectionalTestsPage() {
  const {
    status,
    hasCachedSectionalView,
    loading,
    testsRefreshing,
    userResults,
    sortOption,
    page,
    totalPages,
    selectedPeriod,
    subjectFilter,
    uniquePeriods,
    filteredTests,
    setSortOption,
    setPage,
    setSelectedPeriod,
    setSubjectFilter,
  } = useSectionalTestsController();

  if (status === "loading" && !hasCachedSectionalView) {
    return <Loading showQuote={false} />;
  }

  if (status === "unauthenticated") {
    return <div className="p-8 text-center text-ink-fg">Please sign in to open this section.</div>;
  }

  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5 text-ink-fg">
            <div className="flex items-center gap-3">
              <div className="workbook-sticker bg-accent-2 text-white">Sectional Practice</div>
              <div className="h-3 w-3 rounded-full border-2 border-ink-fg bg-accent-2" />
            </div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight md:text-5xl">
              Zoom in on one weak spot at a time.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 md:text-base">
              Pick a subject, run the exact module you need, and use short feedback loops instead of waiting for a full exam.
            </p>
          </div>
        </section>

        <SectionalTestLibrary
          uniquePeriods={uniquePeriods}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          sortOption={sortOption}
          setSortOption={setSortOption}
          page={page}
          setPage={setPage}
          loading={loading}
          syncing={testsRefreshing}
          filteredTests={filteredTests}
          totalPages={totalPages}
          subjectFilter={subjectFilter}
          setSubjectFilter={setSubjectFilter}
          userResults={userResults}
        />
      </main>
    </div>
  );
}
