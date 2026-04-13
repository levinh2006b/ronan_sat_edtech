import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
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
): Promise<CachedTestsPayload> {
  const { sortBy, sortOrder } = getTestsQueryParams(sortOption);
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

  const res = await api.get(`${API_PATHS.TESTS}?${params.toString()}`);

  return {
    tests: (res.data.tests || []) as CachedTestsPayload["tests"],
    totalPages: (res.data.pagination?.totalPages || 1) as number,
    availablePeriods: (res.data.availablePeriods || ["All"]) as string[],
  };
}
