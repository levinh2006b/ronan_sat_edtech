// Shared API path helpers.

export const API_PATHS = {
    // Static routes
    QUESTIONS: "/api/questions",
    RESULTS: "/api/results",
    CHAT: "/api/chat",
    USER_SETTINGS: "/api/user/settings",
    USER_PASSWORD: "/api/user/password",
    USER_ONBOARDING: "/api/user/onboarding",
    USER_USERNAME: "/api/user/username",
    DEV_ONBOARDING_RESET: "/api/dev/onboarding",
    USER_VOCAB_BOARD: "/api/user/vocab-board",
    USER_REVIEW_REASONS: "/api/user/review-reasons",
    PARENT_DASHBOARD: "/api/parent/dashboard",
    VOCAB_DICTIONARY: "/api/vocab/dictionary",
    FIX_BOARD: "/api/fix-board",
    FIX_REPORTS: "/api/fix-reports",
    RESULT_REASON: "/api/results/reason",
    RESULT_ERROR_LOG: "/api/results/error-log",
    TESTS: "/api/tests",
    AUTH_REGISTER: "/api/auth/register",
    // Dynamic routes

    getQuestionsByTestId: (testId: string) => `/api/questions?testId=${testId}`,
    getQuestionExplanation: (questionId: string) => `/api/questions/${questionId}/explanation`,
    getChatByQuestionId: (questionId: string) => `/api/chat?questionId=${questionId}`,
};
