"use client";

import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import LeaderboardTableSkeleton from "@/components/dashboard/LeaderboardTableSkeleton";
import TestLibrary from "@/components/dashboard/TestLibrary";
import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import UserStatsPanelSkeleton from "@/components/dashboard/UserStatsPanelSkeleton";
import { useFullLengthDashboardController } from "@/components/dashboard/useFullLengthDashboardController";

export default function FullLengthDashboard() {
  const {
    session,
    status,
    hasCachedDashboardView,
    testsLoading,
    testsRefreshing,
    statsLoading,
    statsRefreshing,
    leaderboardLoading,
    leaderboardRefreshing,
    userStats,
    userResults,
    sortOption,
    page,
    totalPages,
    leaderboard,
    selectedPeriod,
    uniquePeriods,
    filteredTests,
    setSortOption,
    setPage,
    setSelectedPeriod,
  } = useFullLengthDashboardController();

  if (status === "loading" && !hasCachedDashboardView) {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <UserStatsPanelSkeleton />
          <LeaderboardTableSkeleton />
          <TestLibrary
            uniquePeriods={["All", "March 2026", "May 2026"]}
            selectedPeriod="All"
            setSelectedPeriod={() => {}}
            sortOption="newest"
            setSortOption={() => {}}
            page={1}
            setPage={() => {}}
            loading
            filteredTests={[]}
            totalPages={1}
          />
        </main>
      </div>
    );
  }

  if (!session && status !== "loading") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {statsLoading && userResults.length === 0 && userStats.testsTaken === 0 && userStats.highestScore === 0 ? (
          <UserStatsPanelSkeleton />
        ) : (
          <div>
            {statsRefreshing ? <div className="mb-2 animate-pulse text-sm text-slate-500">Syncing stats...</div> : null}
            <UserStatsPanel userStats={userStats} userResults={userResults} />
          </div>
        )}

        {leaderboardLoading && leaderboard.length === 0 ? (
          <LeaderboardTableSkeleton />
        ) : (
          <div>
            {leaderboardRefreshing ? <div className="mb-2 animate-pulse text-sm text-slate-500">Syncing leaderboard...</div> : null}
            <LeaderboardTable leaderboard={leaderboard} />
          </div>
        )}

        <TestLibrary
          uniquePeriods={uniquePeriods}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          sortOption={sortOption}
          setSortOption={setSortOption}
          page={page}
          setPage={setPage}
          loading={testsLoading}
          syncing={testsRefreshing}
          filteredTests={filteredTests}
          totalPages={totalPages}
        />
      </main>
    </div>
  );
}
