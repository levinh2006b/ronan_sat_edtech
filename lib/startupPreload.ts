import { getClientCache, setClientCache } from "@/lib/clientCache";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { Role } from "@/lib/permissions";
import { fetchDashboardUserResults, fetchDashboardUserStats, fetchLeaderboard } from "@/lib/services/dashboardService";
import { fetchTestsPage, getTestsClientCacheKey } from "@/lib/services/testLibraryService";
import type { ParentDashboardResponse } from "@/types/parentDashboard";
import type { CachedTestsPayload, LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

const DASHBOARD_STATS_CACHE_KEY = "dashboard:stats";
const DASHBOARD_STATS_API_CACHE_KEY = "api:dashboard:stats";
const DASHBOARD_RESULTS_CACHE_KEY = "dashboard:results:30";
const DASHBOARD_RESULTS_API_CACHE_KEY = "api:dashboard:results:30";
const DASHBOARD_LEADERBOARD_CACHE_KEY = "dashboard:leaderboard";
const DASHBOARD_LEADERBOARD_API_CACHE_KEY = "api:dashboard:leaderboard";
const DASHBOARD_USER_RESULTS_CACHE_KEY = "dashboard:user-results";
const DASHBOARD_USER_RESULTS_API_CACHE_KEY = "api:dashboard:results:all";
const PARENT_DASHBOARD_CACHE_KEY = "parent:dashboard";

const FULL_LENGTH_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", { selectedPeriod: "All" });
const SECTIONAL_READING_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", {
  selectedPeriod: "All",
  subject: "reading",
});
const SECTIONAL_MATH_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", {
  selectedPeriod: "All",
  subject: "math",
});

const preloadJobs = new Map<string, Promise<void>>();

type PreloadParams = {
  role: Role;
  userId: string;
};

function syncMirroredCache<T>(primaryKey: string, mirrorKey: string) {
  const primaryValue = getClientCache<T>(primaryKey);
  const mirrorValue = getClientCache<T>(mirrorKey);

  if (primaryValue === undefined && mirrorValue !== undefined) {
    setClientCache(primaryKey, mirrorValue);
    return mirrorValue;
  }

  if (primaryValue !== undefined && mirrorValue === undefined) {
    setClientCache(mirrorKey, primaryValue);
  }

  return primaryValue;
}

function warmTestsPage(cacheKey: string, subject?: "reading" | "math") {
  const cachedPayload = getClientCache<CachedTestsPayload>(cacheKey);
  if (cachedPayload !== undefined) {
    return Promise.resolve();
  }

  return fetchTestsPage(1, 15, "newest", {
    selectedPeriod: "All",
    subject,
  }).then((payload) => {
    setClientCache(cacheKey, payload);
  });
}

function warmDashboardStats() {
  const cachedStats = syncMirroredCache<UserStatsSummary>(DASHBOARD_STATS_CACHE_KEY, DASHBOARD_STATS_API_CACHE_KEY);
  if (cachedStats !== undefined) {
    return Promise.resolve();
  }

  return fetchDashboardUserStats().then((stats) => {
    setClientCache(DASHBOARD_STATS_CACHE_KEY, stats);
  });
}

function warmDashboardResults(days: 30) {
  const cachedResults = syncMirroredCache<UserResultSummary[]>(
    DASHBOARD_RESULTS_CACHE_KEY,
    DASHBOARD_RESULTS_API_CACHE_KEY,
  );
  if (cachedResults !== undefined) {
    return Promise.resolve();
  }

  return fetchDashboardUserResults(days).then((results) => {
    setClientCache(DASHBOARD_RESULTS_CACHE_KEY, results);
  });
}

function warmDashboardLeaderboard() {
  const cachedLeaderboard = syncMirroredCache<LeaderboardEntry[]>(
    DASHBOARD_LEADERBOARD_CACHE_KEY,
    DASHBOARD_LEADERBOARD_API_CACHE_KEY,
  );
  if (cachedLeaderboard !== undefined) {
    return Promise.resolve();
  }

  return fetchLeaderboard().then((leaderboard) => {
    setClientCache(DASHBOARD_LEADERBOARD_CACHE_KEY, leaderboard);
  });
}

function warmDashboardUserResults() {
  const cachedResults = syncMirroredCache<UserResultSummary[]>(
    DASHBOARD_USER_RESULTS_CACHE_KEY,
    DASHBOARD_USER_RESULTS_API_CACHE_KEY,
  );
  if (cachedResults !== undefined) {
    return Promise.resolve();
  }

  return fetchDashboardUserResults().then((results) => {
    setClientCache(DASHBOARD_USER_RESULTS_CACHE_KEY, results);
  });
}

function warmParentDashboard() {
  const cachedDashboard = getClientCache<ParentDashboardResponse>(PARENT_DASHBOARD_CACHE_KEY);
  if (cachedDashboard !== undefined) {
    return Promise.resolve();
  }

  return api.get(API_PATHS.PARENT_DASHBOARD).then((response) => {
    const payload = response.data as ParentDashboardResponse;
    setClientCache(PARENT_DASHBOARD_CACHE_KEY, payload);
  });
}

async function preloadStudentAppData() {
  await Promise.allSettled([
    warmDashboardStats(),
    warmDashboardResults(30),
    warmDashboardLeaderboard(),
    warmDashboardUserResults(),
    warmTestsPage(FULL_LENGTH_CACHE_KEY),
    warmTestsPage(SECTIONAL_READING_CACHE_KEY, "reading"),
    warmTestsPage(SECTIONAL_MATH_CACHE_KEY, "math"),
  ]);
}

async function preloadParentAppData() {
  await Promise.allSettled([warmParentDashboard(), warmDashboardLeaderboard()]);
}

export function preloadInitialAppData({ role, userId }: PreloadParams) {
  const preloadKey = `${userId}:${role}`;
  const existingJob = preloadJobs.get(preloadKey);
  if (existingJob) {
    return existingJob;
  }

  const job = (async () => {
    if (role === "PARENT") {
      await preloadParentAppData();
      return;
    }

    await preloadStudentAppData();
  })();

  preloadJobs.set(preloadKey, job);
  return job;
}
