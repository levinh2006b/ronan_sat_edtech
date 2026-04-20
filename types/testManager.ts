export type TestManagerCatalogSearchScope = "testTitle" | "passage" | "options";

export type TestManagerCatalogSortOption =
  | "updated_desc"
  | "updated_asc"
  | "test_asc"
  | "test_desc"
  | "question_asc"
  | "question_desc";

export type TestManagerCatalogRow = {
  questionId: string;
  testId: string;
  testTitle: string;
  section: string;
  module: number | null;
  questionNumber: number;
  questionType: "multiple_choice" | "spr";
  difficulty: "easy" | "medium" | "hard";
  domain?: string;
  skill?: string;
  updatedAt: string;
};

export type TestManagerCatalogPage = {
  rows: TestManagerCatalogRow[];
  total: number;
  offset: number;
  limit: number;
  nextOffset: number;
  hasMore: boolean;
};
