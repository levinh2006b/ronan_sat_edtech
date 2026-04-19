"use client";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import TestLibrary from "@/components/dashboard/TestLibrary";
import { useFullLengthDashboardController } from "@/components/dashboard/useFullLengthDashboardController";

export default function FullLengthDashboard() {
  const {
    session,
    status,
    hasCachedDashboardView,
    testsLoading,
    testsRefreshing,
    userResults,
    sortOption,
    page,
    totalPages,
    selectedPeriod,
    uniquePeriods,
    filteredTests,
    setSortOption,
    setPage,
    setSelectedPeriod,
  } = useFullLengthDashboardController();

  if (!session && status !== "loading") {
    return null;
  }

  const shouldShowLibrarySkeleton = (status === "loading" && !hasCachedDashboardView) || testsLoading;

  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <InitialTabBootReady />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Full-Length Practice</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
              Train like test day is already circled.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
              Run complete SAT simulations, review your latest score history, and keep every exam inside one tactile workbook flow.
            </p>
          </div>
        </section>

        <TestLibrary
          uniquePeriods={uniquePeriods}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          sortOption={sortOption}
          setSortOption={setSortOption}
          page={page}
          setPage={setPage}
          loading={shouldShowLibrarySkeleton}
          syncing={testsRefreshing}
          filteredTests={filteredTests}
          totalPages={totalPages}
          userResults={userResults}
        />
      </main>
    </div>
  );
}
