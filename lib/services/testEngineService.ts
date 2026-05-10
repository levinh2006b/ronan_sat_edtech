import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { readThroughClientCache } from "@/lib/clientCache";
import type { QuestionExtra } from "@/lib/questionExtra";
import { normalizeSectionName } from "@/lib/sections";

export type TestEngineMode = "full" | "sectional";

export type TestEnginePrefetchParams = {
  testId: string;
  mode: TestEngineMode;
  section?: string | null;
  module?: number | null;
};

export type TestEngineQuestion = {
  _id: string;
  section: string;
  module: number;
  points?: number;
  questionType?: string;
  questionText?: string;
  passage?: string;
  choices?: string[];
  extra?: QuestionExtra | null;
};

export function getTestEngineCacheKey({ testId, mode, section, module }: TestEnginePrefetchParams) {
  return `test-engine:${testId}:${mode}:${normalizeSectionName(section) ?? "all"}:${module ?? "all"}`;
}

export async function fetchTestEngineQuestions(params: TestEnginePrefetchParams) {
  return readThroughClientCache(
    getTestEngineCacheKey(params),
    async () => {
      const res = await api.get(API_PATHS.getQuestionsByTestId(params.testId), {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      return ((res.data.questions || []) as TestEngineQuestion[]).map((question) => ({
        ...question,
        section: normalizeSectionName(question.section) ?? question.section,
      }));
    },
    { persistForSession: true },
  );
}

export async function prefetchTestEngineQuestions(params: TestEnginePrefetchParams) {
  await fetchTestEngineQuestions(params);
}
