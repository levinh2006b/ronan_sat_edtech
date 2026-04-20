export const TEST_MANAGER_REPORT_REASONS = ["Question", "Answers", "Missing Graph/Image"] as const;

export type TestManagerReportReason = (typeof TEST_MANAGER_REPORT_REASONS)[number];

export type TestManagerReportEntry = {
  id: string;
  reporterId?: string;
  reporterName?: string;
  reason: TestManagerReportReason;
  additionalContext?: string;
  source: "test" | "review";
  createdAt: string;
  resolvedAt?: string;
};

export type TestManagerCard = {
  id: string;
  questionId: string;
  text: string;
  createdAt: string;
  testId: string;
  testTitle: string;
  section: string;
  module: number;
  questionNumber: number;
  reportCount: number;
  isResolved: boolean;
  reports: TestManagerReportEntry[];
};
