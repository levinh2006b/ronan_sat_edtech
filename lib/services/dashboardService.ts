import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

export async function fetchDashboardUserResults(days: number) {
  const statsRes = await api.get(`${API_PATHS.RESULTS}?days=${days}`);
  return (statsRes.data.results || []) as UserResultSummary[];
}

export async function fetchDashboardUserStats() {
  const userRes = await api.get("/api/user/stats");

  return {
    testsTaken: (userRes.data.testsTaken || 0) as number,
    highestScore: (userRes.data.highestScore || 0) as number,
  } satisfies UserStatsSummary;
}

export async function fetchLeaderboard() {
  const res = await api.get("/api/leaderboard");
  return (res.data.leaderboard || []) as LeaderboardEntry[];
}
