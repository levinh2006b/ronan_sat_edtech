//  Các đường dẫn url 

export const API_PATHS = {    
    // Các đường dẫn cố định
    QUESTIONS: "/api/questions",
    RESULTS: "/api/results",
    CHAT: "/api/chat",
    USER_SETTINGS: "/api/user/settings",
    USER_PASSWORD: "/api/user/password",
    USER_VOCAB_BOARD: "/api/user/vocab-board",
    TESTS: "/api/tests",
    AUTH_REGISTER: "/api/auth/register",
    // Các đường dẫn động (thay đổi với từng câu)

    getQuestionsByTestId: (testId: string) => `/api/questions?testId=${testId}`,
    getQuestionExplanation: (questionId: string) => `/api/questions/${questionId}/explanation`,
    getChatByQuestionId: (questionId: string) => `/api/chat?questionId=${questionId}`,    // lấy đoạn chat đối với AI của từng câu hỏi 
};
