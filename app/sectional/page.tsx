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
    return <Loading />;
  }

  if (status === "unauthenticated") {
    return <div className="p-8 text-center">Vui long dang nhap de xem trang nay.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Sectional Practice</h1>
          <p className="mt-2 text-slate-600">Target specific subjects and modules to improve your weak points.</p>
        </div>

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
