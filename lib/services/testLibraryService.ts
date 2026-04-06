import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { CachedTestsPayload, SortOption, TestListItem } from "@/types/testLibrary";

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

export function getTestsClientCacheKey(page: number, limit: number, sortOption: SortOption) {
  const { sortBy, sortOrder } = getTestsQueryParams(sortOption);
  return `tests:${page}:${limit}:${sortBy}:${sortOrder}`;
}

export function getTestPeriodLabel(title: string) {
  const parts = title.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }

  return "Other";
}

export function getUniqueTestPeriods(tests: TestListItem[]) {
  return ["All", ...Array.from(new Set(tests.map((test) => getTestPeriodLabel(test.title))))];
}

export function filterTestsByPeriod(tests: TestListItem[], selectedPeriod: string) {
  return tests.filter((test) => {
    if (selectedPeriod === "All") {
      return true;
    }

    if (selectedPeriod === "Other") {
      return test.title.split(" ").length < 2;
    }

    return test.title.startsWith(selectedPeriod);
  });
}

export function filterSectionalTestsBySubject(tests: TestListItem[], subjectFilter: "reading" | "math") {
  return tests.filter((test) => {
    if (!Array.isArray(test.sections)) {
      return false;
    }

    const targetSectionName = subjectFilter === "reading" ? "Reading and Writing" : "Math";
    const section = test.sections.find((item) => item.name === targetSectionName);
    if (!section) {
      return false;
    }

    if (test.questionCounts) {
      if (subjectFilter === "reading") {
        return (test.questionCounts.rw_1 ?? 0) > 0 || (test.questionCounts.rw_2 ?? 0) > 0;
      }

      return (test.questionCounts.math_1 ?? 0) > 0 || (test.questionCounts.math_2 ?? 0) > 0;
    }

    return (section.questionsCount ?? 0) > 0;
  });
}

export async function fetchTestsPage(page: number, limit: number, sortOption: SortOption): Promise<CachedTestsPayload> {
  const { sortBy, sortOrder } = getTestsQueryParams(sortOption);
  const res = await api.get(`${API_PATHS.TESTS}?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`);

  return {
    tests: (res.data.tests || []) as TestListItem[],
    totalPages: (res.data.pagination?.totalPages || 1) as number,
  };
}
