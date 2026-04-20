import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { TestManagerCatalogPage, TestManagerCatalogSearchScope, TestManagerCatalogSortOption } from "@/types/testManager";

type FetchTestManagerCatalogPageOptions = {
  query?: string;
  searchScope?: TestManagerCatalogSearchScope;
  sort?: TestManagerCatalogSortOption;
  offset?: number;
  limit?: number;
};

export async function fetchTestManagerCatalogPage({
  query = "",
  searchScope = "testTitle",
  sort = "updated_desc",
  offset = 0,
  limit = 20,
}: FetchTestManagerCatalogPageOptions) {
  const params = new URLSearchParams({
    query,
    searchScope,
    sort,
    offset: String(offset),
    limit: String(limit),
  });

  const res = await api.get(`${API_PATHS.TEST_MANAGER_TESTS}?${params.toString()}`);
  return res.data as TestManagerCatalogPage;
}
