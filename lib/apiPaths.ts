// Shared API path helpers.

export const API_PATHS = {
  // Static routes
  QUESTIONS: "/api/questions",
  RESULTS: "/api/results",
  USER_SETTINGS: "/api/user/settings",
  USER_DASHBOARD: "/api/user/dashboard",
  USER_PASSWORD: "/api/user/password",
  USER_ONBOARDING: "/api/user/onboarding",
  USER_USERNAME: "/api/user/username",
  DEV_ONBOARDING_RESET: "/api/dev/onboarding",
  USER_VOCAB_BOARD: "/api/user/vocab-board",
  USER_REVIEW_REASONS: "/api/user/review-reasons",
  VOCAB_DICTIONARY: "/api/vocab/dictionary",
  TEST_MANAGER_TESTS: "/api/test-manager/tests",
  TEST_MANAGER_REPORTS: "/api/test-manager-reports",
  GROUPS: "/api/groups",
  RESULT_REASON: "/api/results/reason",
  RESULT_ERROR_LOG: "/api/results/error-log",
  TESTS: "/api/tests",
  ADMIN_ROLES: "/api/admin/roles",
  USER_GROUP_ACCESS_TOKEN: "/api/user/group-access-token",
  // Dynamic routes

  getQuestionsByTestId: (testId: string) => `/api/questions?testId=${testId}`,
  getGroup: (groupId: string) => `/api/groups/${groupId}`,
  getGroupMembers: (groupId: string) => `/api/groups/${groupId}/members`,
  getGroupMember: (groupId: string, userId: string) => `/api/groups/${groupId}/members/${userId}`,
  getQuestionExplanation: (questionId: string) => `/api/questions/${questionId}/explanation`,
  getReviewResult: (resultId: string) => `/api/results/${resultId}`,
  getReviewQuestion: (resultId: string, questionId: string) => `/api/results/${resultId}/questions/${questionId}`,
  getTestManagerQuestion: (cardId: string) => `/api/test-manager/questions/${cardId}`,
  getTestManagerReport: (questionId: string) => `/api/test-manager-reports/${questionId}`,
};
