export type ReviewQuestion = {
  _id: string;
  section?: string;
  module?: number;
  subject?: string;
  domain?: string;
  questionType?: "multiple_choice" | "spr";
  questionText?: string;
  correctAnswer?: string;
  choices?: string[];
  sprAnswers?: string[];
  passage?: string;
  imageUrl?: string;
};

export type ReviewAnswer = {
  questionId?: ReviewQuestion | null;
  userAnswer?: string;
  isCorrect: boolean;
};

export type ReviewTestReference = {
  _id?: string;
  title?: string;
};

export type ReviewResult = {
  _id: string;
  testId?: ReviewTestReference | null;
  date?: string;
  createdAt?: string;
  score?: number;
  isSectional?: boolean;
  sectionalSubject?: string;
  sectionalModule?: number;
  answers: ReviewAnswer[];
};

export type ReviewStats = {
  correct: number;
  wrong: number;
  omitted: number;
};
