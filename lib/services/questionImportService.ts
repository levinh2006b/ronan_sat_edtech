import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { normalizeSectionName, VERBAL_SECTION } from "@/lib/sections";
import type {
  AdminQuestionUploadRow,
  PreparedQuestionPayload,
  QuestionImportSaveResult,
} from "@/types/adminQuestion";

type QuestionImportErrorDetail = {
  path: string[];
  message: string;
};

type QuestionImportErrorPayload = {
  validationError?: {
    details?: QuestionImportErrorDetail[];
  };
  message?: string;
  errorMessage?: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function buildPreparedQuestionPayload(row: AdminQuestionUploadRow, selectedTestId: string): PreparedQuestionPayload {
  const type = normalizeString(row.questionType || "multiple_choice");
  const payload: PreparedQuestionPayload = {
    testId: selectedTestId,
    section: normalizeSectionName(normalizeString(row.section || VERBAL_SECTION)),
    domain: normalizeString(row.domain),
    skill: normalizeString(row.skill),
    module: Number(row.module) || 1,
    questionType: type,
    questionText: normalizeString(row.questionText),
    explanation: normalizeString(row.explanation),
    difficulty: normalizeString(row.difficulty || "medium").toLowerCase(),
    points: Number(row.points) || 10,
  };

  const passage = normalizeString(row.passage);
  const imageUrl = normalizeString(row.imageUrl);

  if (passage) {
    payload.passage = passage;
  }

  if (imageUrl) {
    payload.imageUrl = imageUrl;
  }

  if (type === "multiple_choice") {
    const choices = [
      normalizeString(row.choice_0),
      normalizeString(row.choice_1),
      normalizeString(row.choice_2),
      normalizeString(row.choice_3),
    ];

    payload.choices = choices;

    const finalAnswer = normalizeString(row.correctAnswer);
    if (finalAnswer.startsWith("choice_")) {
      const index = Number(finalAnswer.split("_")[1]);
      payload.correctAnswer = choices[index] || "";
    } else {
      payload.correctAnswer = finalAnswer;
    }
  } else if (type === "spr") {
    let answers: string[] = [];

    if (Array.isArray(row.sprAnswers) && row.sprAnswers.length > 0) {
      answers = row.sprAnswers.map((answer) => normalizeString(answer)).filter(Boolean);
    } else {
      answers = [normalizeString(row.sprAnswer_0), normalizeString(row.sprAnswer_1), normalizeString(row.sprAnswer_2)].filter(Boolean);
    }

    payload.sprAnswers = answers.length > 0 ? answers : [];
  }

  return payload;
}

export function parseUploadedQuestions(rawJson: string, selectedTestId: string) {
  const rows = JSON.parse(rawJson) as AdminQuestionUploadRow[];
  return rows.map((row) => buildPreparedQuestionPayload(row, selectedTestId));
}

export async function saveUploadedQuestions(
  questions: PreparedQuestionPayload[],
  selectedTestId: string,
): Promise<QuestionImportSaveResult> {
  let successCount = 0;
  let failCount = 0;
  let firstError = "";

  for (let index = 0; index < questions.length; index += 1) {
    const payload = { ...questions[index], testId: selectedTestId };

    try {
      await api.post(API_PATHS.QUESTIONS, payload);
      successCount += 1;
    } catch (error: unknown) {
      failCount += 1;

      const responseData =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: QuestionImportErrorPayload } }).response?.data
          : undefined;

      if (!firstError) {
        const detail = responseData?.validationError?.details?.[0];
        if (detail) {
          firstError = `Truong [${detail.path.join(".")}] bi loi: ${detail.message}`;
        } else {
          firstError = responseData?.message || responseData?.errorMessage || "Loi Database/ObjectId";
        }
      }
    }
  }

  return { successCount, failCount, firstError };
}
