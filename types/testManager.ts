// Admin manage all the questions in database


// Allow to find the keyword that admin typed to be found in these 3 places
export type TestManagerCatalogSearchScope = "testTitle" | "passage" | "options";

// List sort options
export type TestManagerCatalogSortOption =
  | "updated_desc"
  | "updated_asc"
  | "test_asc"
  | "test_desc"
  | "question_asc"
  | "question_desc";


// Info of a specific question in a row
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

// Pagination
export type TestManagerCatalogPage = {
  rows: TestManagerCatalogRow[];  // List questions in a row
  total: number;                  
  offset: number;                 // The starting point to get data ( in page 2, offset is 20 to skip 20 ques in first page )
  limit: number;                  // num of ques in a page
  nextOffset: number;             // contain the offset for the next page + bool to check if next page has any ques
  hasMore: boolean;
};
