export type SortOption = "newest" | "oldest" | "title_asc" | "title_desc";

export type TestQuestionCounts = {
  rw_1: number;
  rw_2: number;
  math_1: number;
  math_2: number;
};

export type TestSection = {
  name: string;
  questionsCount: number;
  timeLimit: number;
};

export type TestListItem = {
  _id: string;
  title: string;
  timeLimit: number;
  difficulty: string;
  sections: TestSection[];
  questionCounts?: Partial<TestQuestionCounts>;
};

export type UserResultAnswerSummary = {
  isCorrect: boolean;
};

export type UserResultSummary = {
  _id?: string;
  testId: string | { _id?: string; title?: string } | null;
  sectionalSubject?: string;
  sectionalModule?: number;
  answers?: UserResultAnswerSummary[];
  score?: number;
  isSectional?: boolean;
  createdAt?: string;
  date?: string;
  updatedAt?: string;
};

export type CachedTestsPayload = {
  tests: TestListItem[];
  totalPages: number;
};

export type UserStatsSummary = {
  testsTaken: number;
  highestScore: number;
};

export type CachedUserStatsPayload = {
  userStats: UserStatsSummary;
  userResults: UserResultSummary[];
};

export type LeaderboardEntry = {
  _id: string;
  name: string;
  testsCompleted: number;
  highestScore: number;
};
