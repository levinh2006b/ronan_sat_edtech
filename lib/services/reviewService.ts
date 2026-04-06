import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { ReviewResult } from "@/types/review";

export async function fetchReviewResults() {
  const res = await api.get(API_PATHS.RESULTS);
  return (res.data.results || []) as ReviewResult[];
}

export async function fetchQuestionExplanation(questionId: string) {
  const res = await api.get(API_PATHS.getQuestionExplanation(questionId));
  return (res.data.explanation || "") as string;
}
