import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { readThroughClientCache } from "@/lib/clientCache";
import type { CachedTestsPayload, SortOption } from "@/types/testLibrary";

export function getTestsQueryParams(sortOption: SortOption) {
  let sortBy = "createdAt";
  let sortOrder = "desc";

  if (sortOption === "oldest") {
    sortOrder = "asc";
  } else if (sortOption === "title_asc") {
    sortBy = "title";
    sortOrder = "asc";
  } else if (sortOption === "title_desc") {
    sortBy = "title";
    sortOrder = "desc";
  }

  return { sortBy, sortOrder };
}

type TestLibraryFilters = {
  selectedPeriod?: string;
  subject?: "reading" | "math";
};

type FetchOptions = {
  forceRefresh?: boolean;
  ttlMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export function getTestsClientCacheKey(
  page: number,
  limit: number,
  sortOption: SortOption,
  filters: TestLibraryFilters = {},
) {
  const { sortBy, sortOrder } = getTestsQueryParams(sortOption);
  const period = filters.selectedPeriod && filters.selectedPeriod !== "All" ? filters.selectedPeriod : "All";
  const subject = filters.subject ?? "all";
  return `tests:${page}:${limit}:${sortBy}:${sortOrder}:${period}:${subject}`;
}

export async function fetchTestsPage(
  page: number,
  limit: number,
  sortOption: SortOption,
  filters: TestLibraryFilters = {},
  options?: FetchOptions,
): Promise<CachedTestsPayload> {
  const { sortBy, sortOrder } = getTestsQueryParams(sortOption);
  const cacheKey = getTestsClientCacheKey(page, limit, sortOption, filters);
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });

  if (filters.selectedPeriod && filters.selectedPeriod !== "All") {
    params.set("period", filters.selectedPeriod);
  }

  if (filters.subject) {
    params.set("subject", filters.subject);
  }

  return readThroughClientCache(
    cacheKey,
    async () => {
      const res = await api.get(`${API_PATHS.TESTS}?${params.toString()}`, { signal: options?.signal });

      return {
        tests: (res.data.tests || []) as CachedTestsPayload["tests"],
        totalPages: (res.data.pagination?.totalPages || 1) as number,
        availablePeriods: (res.data.availablePeriods || ["All"]) as string[],
      };
    },
    options,
  );
}
