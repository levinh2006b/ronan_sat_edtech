export type AdminQuestionFormState = {
  section: string;
  module: number;
  questionType: "multiple_choice" | "spr";
  questionText: string;
  passage: string;
  imageUrl: string;
  choices: string[];
  correctAnswer: string;
  sprAnswers: string[];
  explanation: string;
  difficulty: string;
  points: number;
};

export type AdminQuestionUploadRow = {
  section?: string;
  module?: number | string;
  questionType?: string;
  questionText?: string;
  explanation?: string;
  difficulty?: string;
  points?: number | string;
  passage?: string;
  imageUrl?: string;
  choice_0?: string;
  choice_1?: string;
  choice_2?: string;
  choice_3?: string;
  correctAnswer?: string;
  sprAnswers?: string[];
  sprAnswer_0?: string;
  sprAnswer_1?: string;
  sprAnswer_2?: string;
};

export type PreparedQuestionPayload = {
  testId: string;
  section: string;
  module: number;
  questionType: string;
  questionText: string;
  explanation: string;
  difficulty: string;
  points: number;
  passage?: string;
  imageUrl?: string;
  choices?: string[];
  correctAnswer?: string;
  sprAnswers?: string[];
};

export type QuestionImportSaveResult = {
  successCount: number;
  failCount: number;
  firstError: string;
};
