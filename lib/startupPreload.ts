import { getClientCache } from "@/lib/clientCache";
import { getCachedDashboardOverview, getCachedDashboardUserResults, setCachedDashboardOverview, setCachedDashboardUserResults } from "@/lib/dashboardCache";
import type { Role } from "@/lib/permissions";
import { fetchDashboardOverview, fetchDashboardUserResults } from "@/lib/services/dashboardService";
import { fetchHallOfFamePage } from "@/lib/services/hallOfFameService";
import { fetchReviewResults, REVIEW_RESULTS_CACHE_KEY } from "@/lib/services/reviewService";
import { fetchTestsPage, getTestsClientCacheKey } from "@/lib/services/testLibraryService";
import type { ReviewResult } from "@/types/review";
import type { CachedTestsPayload } from "@/types/testLibrary";

const FULL_LENGTH_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", { selectedPeriod: "All" });
const SECTIONAL_READING_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", {
  selectedPeriod: "All",
  subject: "reading",
});

const preloadJobs = new Map<string, Promise<void>>();

type PreloadParams = {
  role: Role;
  userId: string;
};

type PreloadOptions = {
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

function warmTestsPage(cacheKey: string, subject?: "reading" | "math", options?: PreloadOptions) {
  const cachedPayload = getClientCache<CachedTestsPayload>(cacheKey);
  if (!options?.forceRefresh && cachedPayload !== undefined) {
    return Promise.resolve();
  }

  return fetchTestsPage(1, 15, "newest", {
    selectedPeriod: "All",
    subject,
  }, options).then(() => undefined);
}

function warmDashboardStats(options?: PreloadOptions) {
  if (!options?.forceRefresh && getCachedDashboardOverview() !== undefined) {
    return Promise.resolve();
  }

  return preloadDashboardOverview(options).then(() => undefined);
}

function warmDashboardUserResults(options?: PreloadOptions) {
  if (!options?.forceRefresh && getCachedDashboardUserResults() !== undefined) {
    return Promise.resolve();
  }

  return preloadDashboardUserResults(undefined, options).then(() => undefined);
}

function warmDashboardActivity(options?: PreloadOptions) {
  return preloadDashboardUserResults(30, options).then(() => undefined);
}

function warmDashboardLeaderboard(options?: PreloadOptions) {
  return fetchHallOfFamePage(1, 8, options).then(() => undefined);
}

function warmReviewResults(options?: PreloadOptions) {
  if (!options?.forceRefresh && getClientCache<ReviewResult[]>(REVIEW_RESULTS_CACHE_KEY) !== undefined) {
    return Promise.resolve();
  }

  return fetchReviewResults(options).then(() => undefined);
}

export async function preloadDashboardOverview(options?: PreloadOptions) {
  const cachedOverview = getCachedDashboardOverview();
  if (!options?.forceRefresh && cachedOverview !== undefined) {
    return cachedOverview;
  }

  const overview = await fetchDashboardOverview(options);
  setCachedDashboardOverview(overview);
  return overview;
}

export async function preloadDashboardUserResults(days?: number, options?: PreloadOptions) {
  const cachedResults = getCachedDashboardUserResults();
  if (!days && !options?.forceRefresh && cachedResults !== undefined) {
    return cachedResults;
  }

  const results = await fetchDashboardUserResults(days, options);
  if (!days) {
    setCachedDashboardUserResults(results);
  }
  return results;
}

export async function preloadDashboardRouteData(options?: PreloadOptions) {
  await Promise.allSettled([
    warmDashboardStats(options),
    warmDashboardUserResults(options),
    warmDashboardActivity(options),
    warmDashboardLeaderboard(options),
  ]);
}

export function preloadFullLengthRouteData(options?: PreloadOptions) {
  return warmTestsPage(FULL_LENGTH_CACHE_KEY, undefined, options);
}

export function preloadSectionalRouteData(options?: PreloadOptions) {
  return warmTestsPage(SECTIONAL_READING_CACHE_KEY, "reading", options);
}

export function preloadReviewRouteData(options?: PreloadOptions) {
  return warmReviewResults(options);
}

export async function preloadPostSubmitStudentData() {
  await Promise.allSettled([
    preloadDashboardRouteData({ forceRefresh: true }),
    preloadReviewRouteData({ forceRefresh: true }),
  ]);
}

async function preloadStudentAppData() {
  await Promise.allSettled([
    preloadDashboardRouteData(),
    preloadFullLengthRouteData(),
    preloadSectionalRouteData(),
    preloadReviewRouteData(),
  ]);
}

export function preloadInitialAppData({ role, userId }: PreloadParams) {
  if (role !== "STUDENT") {
    return Promise.resolve();
  }

  const preloadKey = `${userId}:${role}`;
  const existingJob = preloadJobs.get(preloadKey);
  if (existingJob) {
    return existingJob;
  }

  const job = (async () => {
    await preloadStudentAppData();
  })();

  preloadJobs.set(preloadKey, job);
  return job;
}
