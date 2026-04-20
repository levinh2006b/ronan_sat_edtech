import type { QuestionExtra } from "@/lib/questionExtra";

export type ReviewQuestion = {
  _id: string;
  section?: string;
  module?: number;
  subject?: string;
  domain?: string;
  skill?: string;
  difficulty?: string;
  questionType?: "multiple_choice" | "spr";
  questionText?: string;
  correctAnswer?: string;
  choices?: string[];
  sprAnswers?: string[];
  passage?: string;
  extra?: QuestionExtra | null;
};

export type ReviewAnswer = {
  questionId?: ReviewQuestion | null;
  userAnswer?: string;
  isCorrect: boolean;
  errorReason?: string;
  questionLoaded?: boolean;
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
  totalScore?: number;
  readingScore?: number;
  mathScore?: number;
  isSectional?: boolean;
  sectionalSubject?: string;
  sectionalModule?: number;
  answers: ReviewAnswer[];
  detailsLoaded?: boolean;
};

export type ReviewErrorLogStatus = "wrong" | "omitted";

export type ReviewErrorLogEntry = {
  key: string;
  resultId: string;
  questionId: string;
  questionNumber: number;
  testId?: string;
  timestamp?: string;
  testTitle: string;
  domain: string;
  skill: string;
  difficulty: string;
  reason?: string;
  status: ReviewErrorLogStatus;
  answer: ReviewAnswer;
};

export type ReviewErrorLogPage = {
  rows: ReviewErrorLogEntry[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
};

export type ReviewStats = {
  correct: number;
  wrong: number;
  omitted: number;
};
