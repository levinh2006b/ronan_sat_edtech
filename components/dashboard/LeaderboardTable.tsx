"use client";

import { Medal } from "lucide-react";

interface LeaderboardTableProps {
  leaderboard: Array<{
    _id: string;
    name: string;
    testsCompleted: number;
    highestScore: number;
  }>;
}

export default function LeaderboardTable({ leaderboard }: LeaderboardTableProps) {
  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border-2 border-ink-fg bg-primary p-3 brutal-shadow-sm">
            <Medal className="h-5 w-5 text-ink-fg" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg">Weekly Top Achievers</h2>
            <p className="mt-1 text-sm text-ink-fg/70">Students scoring above 1450 this week.</p>
          </div>
        </div>
      </div>

      <div className="workbook-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-fg">
            <thead>
              <tr>
                <th className="w-24 px-6 py-4 font-bold">Rank</th>
                <th className="px-6 py-4 font-bold">Student Name</th>
                <th className="px-6 py-4 text-center font-bold">Tests Completed</th>
                <th className="px-6 py-4 text-center font-bold">Highest Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center italic text-ink-fg/70">
                    No students have scored above 1450 this week.
                  </td>
                </tr>
              ) : (
                leaderboard.map((student, index) => (
                  <tr key={student._id}>
                    <td className="px-6 py-4 font-semibold">
                      {index === 0 ? (
                        <span className="text-xl text-yellow-500" title="Top 1">🥇 1</span>
                      ) : index === 1 ? (
                        <span className="text-xl text-slate-400" title="Top 2">🥈 2</span>
                      ) : index === 2 ? (
                        <span className="text-xl text-amber-600" title="Top 3">🥉 3</span>
                      ) : (
                        <span className="ml-1 text-ink-fg/70">#{index + 1}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-ink-fg">{student.name}</td>
                    <td className="px-6 py-4 text-center font-bold text-accent-2">{student.testsCompleted}</td>
                    <td className="px-6 py-4 text-center font-bold text-accent-3">{student.highestScore}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
