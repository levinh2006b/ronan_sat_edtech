import type { AppSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReviewDiagnostics, matchesReviewFilter, type TestManagerReviewFilter } from "@/lib/testManagerReview";
import type { TestManagerCatalogPage, TestManagerCatalogRow, TestManagerCatalogSearchScope, TestManagerCatalogSortOption } from "@/types/testManager";

const PUBLIC_EXAM_EDIT_PERMISSION = "edit_public_exams";

type CatalogQueryOptions = {
  query?: string;
  searchScope?: TestManagerCatalogSearchScope;
  sort?: TestManagerCatalogSortOption;
  reviewFilter?: TestManagerReviewFilter;
  hideTier3?: boolean;
  offset?: number;
  limit?: number;
};

type CatalogQuestionRow = {
  id: string;
  section_id: string;
  question_type: "multiple_choice" | "spr";
  question_text: string;
  passage: string | null;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  domain: string | null;
  skill: string | null;
  image_url: string | null;
  extra: unknown;
  position: number;
  updated_at: string;
  question_options: Array<{ option_text: string; display_order: number }> | null;
  test_sections: {
    id: string;
    test_id: string;
    name: string;
    module_number: number | null;
    tests: {
      id: string;
      title: string;
      visibility: "public" | "private";
      status: string;
    } | null;
  } | null;
};

class TestManagerCatalogError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function requirePublicExamEditor(session: AppSession) {
  if (session.user.permissions.includes(PUBLIC_EXAM_EDIT_PERMISSION)) {
    return;
  }

  throw new TestManagerCatalogError(403, "You do not have permission to browse public exams.");
}

function normalizeSearchScope(value?: string): TestManagerCatalogSearchScope {
  return value === "passage" || value === "options" ? value : "testTitle";
}

function normalizeSortOption(value?: string): TestManagerCatalogSortOption {
  switch (value) {
    case "updated_asc":
    case "test_asc":
    case "test_desc":
    case "question_asc":
    case "question_desc":
      return value;
    default:
      return "updated_desc";
  }
}

function normalizeReviewFilter(value?: string): TestManagerReviewFilter {
  switch (value) {
    case "has_figure_or_table":
    case "keyword_needs_figure":
    case "markdown_table_payload":
    case "bad_extra_payload":
    case "math_dollar_latex":
    case "missing_math_delimiters":
    case "rhetorical_notes_format":
    case "has_keyword_any":
    case "visual_reference_keyword":
    case "broken_csv_table":
    case "orphan_visual":
      return value;
    default:
      return "all";
  }
}

function normalizeOffset(value?: number) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value as number) : 0;
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) {
    return 20;
  }

  return Math.min(50, Math.floor(value as number));
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function buildPassageFigureMap(rows: CatalogQuestionRow[]) {
  const map = new Map<string, boolean>();
  for (const row of rows) {
    const passageKey = normalizeText(row.passage);
    if (!passageKey) {
      continue;
    }

    const hasFigure = Boolean(row.image_url?.trim()) || Boolean(row.extra);
    map.set(passageKey, Boolean(map.get(passageKey) || hasFigure));
  }
  return map;
}

function searchMatches(row: CatalogQuestionRow, query: string, scope: TestManagerCatalogSearchScope) {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  const lowerQuery = trimmed.toLowerCase();
  const numericQuestion = /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : null;
  if (numericQuestion !== null && row.position === numericQuestion) {
    return true;
  }

  if (scope === "passage") {
    return (row.passage ?? "").toLowerCase().includes(lowerQuery) || row.question_text.toLowerCase().includes(lowerQuery);
  }

  if (scope === "options") {
    return (row.question_options ?? []).some((option) => option.option_text.toLowerCase().includes(lowerQuery));
  }

  return (row.test_sections?.tests?.title ?? "").toLowerCase().includes(lowerQuery);
}

function compareRows(left: TestManagerCatalogRow, right: TestManagerCatalogRow, sort: TestManagerCatalogSortOption) {
  const textCompare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
  const suspicionRank = (level?: TestManagerCatalogRow["suspicionLevel"]) => {
    switch (level) {
      case "tier1":
        return 0;
      case "tier2":
        return 1;
      case "tier3":
        return 2;
      default:
        return 3;
    }
  };
  const suspicionCompare = suspicionRank(left.suspicionLevel) - suspicionRank(right.suspicionLevel);
  const fallback =
    suspicionCompare
    ||
    textCompare(left.testTitle, right.testTitle)
    || textCompare(left.section, right.section)
    || (left.module ?? 0) - (right.module ?? 0)
    || left.questionNumber - right.questionNumber
    || textCompare(left.questionId, right.questionId);

  switch (sort) {
    case "updated_asc":
      return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime() || fallback;
    case "test_asc":
      return textCompare(left.testTitle, right.testTitle) || fallback;
    case "test_desc":
      return textCompare(right.testTitle, left.testTitle) || fallback;
    case "question_asc":
      return left.questionNumber - right.questionNumber || fallback;
    case "question_desc":
      return right.questionNumber - left.questionNumber || fallback;
    default:
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() || fallback;
  }
}

function buildCatalogRow(row: CatalogQuestionRow, passageFigureMap: Map<string, boolean>): TestManagerCatalogRow | null {
  const test = row.test_sections?.tests;
  if (!row.test_sections || !test || test.visibility !== "public") {
    return null;
  }

  const choices = [...(row.question_options ?? [])]
    .sort((left, right) => left.display_order - right.display_order)
    .map((option) => option.option_text);
  const passageKey = normalizeText(row.passage);
  const diagnostics = getReviewDiagnostics({
    questionText: row.question_text,
    passage: row.passage ?? "",
    choices,
    explanation: row.explanation,
    domain: row.domain ?? "",
    skill: row.skill ?? "",
    section: row.test_sections.name,
    imageUrl: row.image_url ?? "",
    extra: row.extra,
    hasSharedPassageFigure: passageKey ? passageFigureMap.get(passageKey) : false,
  });

  return {
    questionId: row.id,
    testId: test.id,
    testTitle: test.title,
    section: row.test_sections.name,
    module: row.test_sections.module_number,
    questionNumber: row.position,
    questionType: row.question_type,
    difficulty: row.difficulty,
    domain: row.domain ?? undefined,
    skill: row.skill ?? undefined,
    updatedAt: row.updated_at,
    reviewFlags: diagnostics.flags,
    matchedKeywords: diagnostics.matchedKeywords,
    keywordConfidence: diagnostics.keywordConfidence,
    suspicionLevel: diagnostics.suspicionLevel,
    extraType: diagnostics.extraType,
    hasImageUrl: diagnostics.hasImageUrl,
    hasQuestionExtra: diagnostics.hasQuestionExtra,
    hasPassageFigure: diagnostics.hasPassageFigure,
    contentSnippet: diagnostics.contentSnippet,
  };
}

export const testManagerCatalogService = {
  async getPage(options: CatalogQueryOptions, session: AppSession): Promise<TestManagerCatalogPage> {
    requirePublicExamEditor(session);

    const supabase = createSupabaseAdminClient();
    const searchScope = normalizeSearchScope(options.searchScope);
    const sort = normalizeSortOption(options.sort);
    const reviewFilter = normalizeReviewFilter(options.reviewFilter);
    const hideTier3 = Boolean(options.hideTier3);
    const offset = normalizeOffset(options.offset);
    const limit = normalizeLimit(options.limit);

    const { data, error } = await supabase
      .from("questions")
      .select(
        `
          id,
          section_id,
          question_type,
          question_text,
          passage,
          explanation,
          difficulty,
          domain,
          skill,
          image_url,
          extra,
          position,
          updated_at,
          question_options (
            option_text,
            display_order
          ),
          test_sections!inner (
            id,
            test_id,
            name,
            module_number,
            tests!inner (
              id,
              title,
              visibility,
              status
            )
          )
        `,
      )
      .eq("test_sections.tests.visibility", "public")
      .returns<CatalogQuestionRow[]>();

    if (error || !data) {
      throw new TestManagerCatalogError(500, error?.message ?? "Failed to load test manager catalog.");
    }

    const passageFigureMap = buildPassageFigureMap(data);
    const rows = data
      .filter((row) => searchMatches(row, options.query ?? "", searchScope))
      .map((row) => buildCatalogRow(row, passageFigureMap))
      .filter((row): row is TestManagerCatalogRow => Boolean(row))
      .filter((row) =>
        matchesReviewFilter(
          {
            flags: row.reviewFlags,
            matchedKeywords: row.matchedKeywords,
            keywordConfidence: row.keywordConfidence,
            suspicionLevel: row.suspicionLevel,
            extraType: row.extraType ?? null,
            hasImageUrl: row.hasImageUrl,
            hasQuestionExtra: row.hasQuestionExtra,
            hasPassageFigure: row.hasPassageFigure,
            contentSnippet: row.contentSnippet,
          },
          reviewFilter,
        ),
      )
      .filter((row) => !(hideTier3 && reviewFilter === "keyword_needs_figure" && row.suspicionLevel === "tier3"))
      .sort((left, right) => compareRows(left, right, sort));

    const slicedRows = rows.slice(offset, offset + limit);

    return {
      rows: slicedRows,
      total: rows.length,
      offset,
      limit,
      nextOffset: offset + slicedRows.length,
      hasMore: offset + slicedRows.length < rows.length,
    };
  },

  async getNextQuestionId(options: CatalogQueryOptions & { currentQuestionId: string }, session: AppSession) {
    let offset = 0;
    let foundCurrent = false;

    while (true) {
      const page = await this.getPage({ ...options, offset, limit: 50 }, session);
      if (page.rows.length === 0) {
        return null;
      }

      if (!foundCurrent) {
        const currentIndex = page.rows.findIndex((row) => row.questionId === options.currentQuestionId);
        if (currentIndex === -1) {
          if (!page.hasMore) {
            return page.rows[0]?.questionId ?? null;
          }
        } else if (page.rows[currentIndex + 1]) {
          return page.rows[currentIndex + 1].questionId;
        } else {
          foundCurrent = true;
        }
      } else {
        return page.rows[0]?.questionId ?? null;
      }

      if (!page.hasMore) {
        return null;
      }
      offset = page.nextOffset;
    }
  },
};

export function getTestManagerCatalogErrorStatus(error: unknown) {
  if (error instanceof TestManagerCatalogError) {
    return error.status;
  }

  return 500;
}

export function getTestManagerCatalogErrorMessage(error: unknown) {
  if (error instanceof TestManagerCatalogError) {
    return error.message;
  }

  return error instanceof Error ? error.message : "Failed to load test manager catalog.";
}
