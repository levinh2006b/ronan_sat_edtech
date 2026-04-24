import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { readThroughClientCache } from "@/lib/clientCache";

export type HallOfFameStudent = {
  _id: string;
  name: string;
  school: string;
  score: number;
  examDate: string;
  imageUrl: string;
};

export type HallOfFamePage = {
  students: HallOfFameStudent[];
  totalPages: number;
  currentPage: number;
};

type FetchOptions = {
  forceRefresh?: boolean;
  ttlMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export function getHallOfFameClientCacheKey(page: number, limit: number) {
  return `hall-of-fame:${page}:${limit}`;
}

export async function fetchHallOfFamePage(page: number, limit: number, options?: FetchOptions) {
  const cacheKey = getHallOfFameClientCacheKey(page, limit);
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return readThroughClientCache(
    cacheKey,
    async () => {
      const response = await api.get(`${API_PATHS.STUDENTS}?${params.toString()}`, { signal: options?.signal });
      return response.data as HallOfFamePage;
    },
    options,
  );
}
