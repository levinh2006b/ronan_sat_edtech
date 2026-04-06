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
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Your Progress</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-6">
          <div className="mr-4 rounded-lg bg-blue-100 p-3">
            <Trophy className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Highest Score</p>
            <p className="text-2xl font-bold text-slate-900">{userStats.highestScore > 0 ? userStats.highestScore : "—"}</p>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-2 flex items-center">
            <div className="mr-3 rounded-lg bg-orange-100 p-2 sm:mr-4 sm:p-3">
              <Flame className="h-5 w-5 text-orange-600 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 sm:text-sm">Activity (30 Days)</p>
            </div>
          </div>
          <div className="mt-auto w-full">
            {userResults.length > 0 ? (
              <ActivityHeatmap results={userResults} />
            ) : (
              <p className="mt-2 text-center text-[10px] text-slate-400">Complete a test to see activity.</p>
            )}
          </div>
        </div>

        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-6">
          <div className="mr-4 rounded-lg bg-emerald-100 p-3">
            <Target className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tests Completed</p>
            <p className="text-2xl font-bold text-slate-900">{userStats.testsTaken}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
