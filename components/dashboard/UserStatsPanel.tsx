"use client";

import { Flame, Target, Trophy } from "lucide-react";

import ActivityHeatmap from "@/components/ActivityHeatmap";
import type { UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

interface UserStatsPanelProps {
  userStats: UserStatsSummary;
  userResults: UserResultSummary[];
}

export default function UserStatsPanel({ userStats, userResults }: UserStatsPanelProps) {
  return (
    <section>
      <div className="mb-4">
        <div className="workbook-sticker bg-primary text-ink-fg">Your Progress</div>
        <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">
          Score and consistency snapshot.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="workbook-panel flex items-center p-6">
          <div className="mr-4 rounded-2xl border-2 border-ink-fg bg-primary p-3 brutal-shadow-sm">
            <Trophy className="h-6 w-6 text-ink-fg" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-fg/70">Highest Score</p>
            <p className="font-display text-4xl font-black tracking-tight text-ink-fg">
              {userStats.highestScore > 0 ? userStats.highestScore : "—"}
            </p>
          </div>
        </div>

        <div className="workbook-panel flex flex-col justify-center p-6">
          <div className="mb-2 flex items-center">
            <div className="mr-3 rounded-2xl border-2 border-ink-fg bg-accent-3 p-2 text-white sm:mr-4 sm:p-3 brutal-shadow-sm">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-fg/70 sm:text-sm">Activity (30 Days)</p>
            </div>
          </div>
          <div className="mt-auto w-full">
            {userResults.length > 0 ? (
              <ActivityHeatmap results={userResults} />
            ) : (
              <p className="mt-2 text-center text-[10px] text-ink-fg/60">Complete a test to see activity.</p>
            )}
          </div>
        </div>

        <div className="workbook-panel flex items-center p-6">
          <div className="mr-4 rounded-2xl border-2 border-ink-fg bg-accent-2 p-3 text-white brutal-shadow-sm">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-fg/70">Tests Completed</p>
            <p className="font-display text-4xl font-black tracking-tight text-ink-fg">{userStats.testsTaken}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
