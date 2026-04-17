import { getClientCache, setClientCache } from "@/lib/clientCache";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

/** Shared options accepted by every service function in this module. */
interface FetchOptions {
  /** When true, skip the cache and always hit the network. */
  forceRefresh?: boolean;
}

// ---------------------------------------------------------------------------
// fetchDashboardUserResults
// ---------------------------------------------------------------------------

/**
 * Returns the current user's result history for the given time window.
 *
 * The cache key includes the `days` parameter so results for different windows
 * are stored independently and never collide.
 */
export async function fetchDashboardUserResults(
  days?: number,
  options?: FetchOptions,
): Promise<UserResultSummary[]> {
  const cacheKey = `api:dashboard:results:${days ?? "all"}`;

  // Cache hit — return immediately without a network call.
  if (!options?.forceRefresh) {
    const cached = getClientCache<UserResultSummary[]>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  // Cache miss or forced refresh — fetch from the API.
  const query = typeof days === "number" ? `?days=${days}` : "";
  const res = await api.get(`${API_PATHS.RESULTS}${query}`);
  const results = (res.data.results || []) as UserResultSummary[];

  // Only cache a successful, non-empty-by-error response.
  setClientCache(cacheKey, results);

  return results;
}

// ---------------------------------------------------------------------------
// fetchDashboardUserStats
// ---------------------------------------------------------------------------

/**
 * Returns the current user's aggregate stats (tests taken, highest score).
 */
export async function fetchDashboardUserStats(
  options?: FetchOptions,
): Promise<UserStatsSummary> {
  const cacheKey = "api:dashboard:stats";

  // Cache hit — return immediately without a network call.
  if (!options?.forceRefresh) {
    const cached = getClientCache<UserStatsSummary>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  // Cache miss or forced refresh — fetch from the API.
  const res = await api.get("/api/user/stats");
  const stats = {
    testsTaken: (res.data.testsTaken || 0) as number,
    highestScore: (res.data.highestScore || 0) as number,
  } satisfies UserStatsSummary;

  setClientCache(cacheKey, stats);

  return stats;
}

// ---------------------------------------------------------------------------
// fetchLeaderboard
// ---------------------------------------------------------------------------

/**
 * Returns the global leaderboard entries.
 */
export async function fetchLeaderboard(
  options?: FetchOptions,
): Promise<LeaderboardEntry[]> {
  const cacheKey = "api:dashboard:leaderboard";

  // Cache hit — return immediately without a network call.
  if (!options?.forceRefresh) {
    const cached = getClientCache<LeaderboardEntry[]>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  // Cache miss or forced refresh — fetch from the API.
  const res = await api.get("/api/leaderboard");
  const leaderboard = (res.data.leaderboard || []) as LeaderboardEntry[];

  setClientCache(cacheKey, leaderboard);

  return leaderboard;
}
