"use client";

import { useMemo } from "react";

import { Flame, Target, Trophy } from "lucide-react";

import ActivityHeatmap from "@/components/ActivityHeatmap";
import type { UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

interface UserStatsPanelProps {
  userStats: UserStatsSummary;
  userResults: UserResultSummary[];
}

export default function UserStatsPanel({ userStats, userResults }: UserStatsPanelProps) {
  const currentStreak = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeDays = new Set(
      userResults.map((result) => {
        const date = new Date(result.createdAt || result.date || result.updatedAt || today.toISOString());
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split("T")[0];
      }),
    );

    let streak = 0;
    const cursor = new Date(today);

    while (activeDays.has(cursor.toISOString().split("T")[0])) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [userResults]);

  return (
    <section>
      <div className="mb-4">
        <div className="workbook-sticker bg-primary text-ink-fg">Your Progress</div>
        <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">
          Score and consistency snapshot.
        </h2>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-stretch">
        <div className="grid gap-4">
          <div className="workbook-panel grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-4 p-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink-fg bg-primary brutal-shadow-sm">
              <Trophy className="h-6 w-6 text-ink-fg" />
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-medium text-ink-fg/70">Highest Score</p>
              <p className="mt-2 font-display text-4xl font-black tracking-tight text-ink-fg">
                {userStats.highestScore > 0 ? userStats.highestScore : "—"}
              </p>
            </div>
          </div>

          <div className="workbook-panel grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-4 p-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink-fg bg-accent-2 text-white brutal-shadow-sm">
              <Target className="h-6 w-6" />
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-medium text-ink-fg/70">Tests Completed</p>
              <p className="mt-2 font-display text-4xl font-black tracking-tight text-ink-fg">{userStats.testsTaken}</p>
            </div>
          </div>
        </div>

        <div className="workbook-panel grid h-full grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink-fg bg-accent-3 text-white brutal-shadow-sm">
            <Flame className="h-6 w-6" />
          </div>
          <div className="min-w-0 pt-1">
            <p className="text-sm font-medium text-ink-fg/70">Activity (30 Days)</p>
            <p className="mt-2 text-base font-black uppercase tracking-[0.12em] text-ink-fg">
              <span className="font-display text-3xl tracking-tight">{currentStreak}</span> day streak
            </p>
          </div>
          <div className="col-span-2 hidden rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-5 lg:grid lg:flex-1 lg:place-items-center">
            {userResults.length > 0 ? (
              <ActivityHeatmap results={userResults} />
            ) : (
              <p className="text-center text-xs text-ink-fg/60">Complete a test to see activity.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
