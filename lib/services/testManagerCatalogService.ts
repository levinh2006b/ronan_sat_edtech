import type { AppSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TestManagerCatalogPage, TestManagerCatalogRow, TestManagerCatalogSearchScope, TestManagerCatalogSortOption } from "@/types/testManager";

const PUBLIC_EXAM_EDIT_PERMISSION = "edit_public_exams";
const BATCH_SIZE = 500;

type CatalogQueryOptions = {
  query?: string;
  searchScope?: TestManagerCatalogSearchScope;
  sort?: TestManagerCatalogSortOption;
  offset?: number;
  limit?: number;
};

type PublicTestRow = {
  id: string;
  title: string;
};

type SectionRow = {
  id: string;
  test_id: string;
  name: string;
  module_number: number | null;
};

type QuestionRow = {
  id: string;
  section_id: string;
  position: number;
  question_type: "multiple_choice" | "spr";
  difficulty: "easy" | "medium" | "hard";
  domain: string | null;
  skill: string | null;
  updated_at: string;
};

type OptionMatchRow = {
  question_id: string;
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

function normalizeOffset(value?: number) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value as number) : 0;
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) {
    return 20;
  }

  return Math.min(50, Math.floor(value as number));
}

function isNumericQuery(value: string) {
  return /^\d+$/.test(value.trim());
}

function compareCatalogRows(left: TestManagerCatalogRow, right: TestManagerCatalogRow, sort: TestManagerCatalogSortOption) {
  switch (sort) {
    case "updated_asc":
    case "updated_desc": {
      const diff = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      if (diff !== 0) {
        return sort === "updated_asc" ? diff : -diff;
      }
      break;
    }
    case "test_asc":
    case "test_desc": {
      const diff = left.testTitle.localeCompare(right.testTitle, undefined, { sensitivity: "base" });
      if (diff !== 0) {
        return sort === "test_asc" ? diff : -diff;
      }
      break;
    }
    case "question_asc":
    case "question_desc": {
      const diff = left.questionNumber - right.questionNumber;
      if (diff !== 0) {
        return sort === "question_asc" ? diff : -diff;
      }
      break;
    }
  }

  const testDiff = left.testTitle.localeCompare(right.testTitle, undefined, { sensitivity: "base" });
  if (testDiff !== 0) {
    return testDiff;
  }

  const sectionDiff = left.section.localeCompare(right.section, undefined, { sensitivity: "base" });
  if (sectionDiff !== 0) {
    return sectionDiff;
  }

  const moduleDiff = (left.module ?? 0) - (right.module ?? 0);
  if (moduleDiff !== 0) {
    return moduleDiff;
  }

  return left.questionNumber - right.questionNumber;
}

async function fetchAllPaginated<T>(
  fetchBatch: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await fetchBatch(from, from + BATCH_SIZE - 1);
    if (error) {
      throw new TestManagerCatalogError(500, error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < BATCH_SIZE) {
      return rows;
    }
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function getPublicTests() {
  const supabase = createSupabaseAdminClient();
  return fetchAllPaginated<PublicTestRow>((from, to) =>
    supabase.from("tests").select("id,title").eq("visibility", "public").range(from, to),
  );
}

async function getSectionsForTests(testIds: string[]) {
  if (testIds.length === 0) {
    return [] as SectionRow[];
  }

  const supabase = createSupabaseAdminClient();
  const responses = await Promise.all(
    chunk(testIds, 500).map((testIdChunk) =>
      supabase
        .from("test_sections")
        .select("id,test_id,name,module_number")
        .in("test_id", testIdChunk),
    ),
  );

  const rows: SectionRow[] = [];
  for (const response of responses) {
    if (response.error) {
      throw new TestManagerCatalogError(500, response.error.message);
    }

    rows.push(...((response.data ?? []) as SectionRow[]));
  }

  return rows;
}

async function getQuestionsBySectionIds(sectionIds: string[], options?: { passageQuery?: string; questionNumber?: number }) {
  if (sectionIds.length === 0) {
    return [] as QuestionRow[];
  }

  const supabase = createSupabaseAdminClient();
  return fetchAllPaginated<QuestionRow>((from, to) => {
    let request = supabase
      .from("questions")
      .select("id,section_id,position,question_type,difficulty,domain,skill,updated_at")
      .in("section_id", sectionIds)
      .range(from, to);

    if (options?.passageQuery) {
      request = request.ilike("passage", `%${options.passageQuery}%`);
    }

    if (typeof options?.questionNumber === "number") {
      request = request.eq("position", options.questionNumber);
    }

    return request;
  });
}

async function getQuestionsByIds(questionIds: string[]) {
  if (questionIds.length === 0) {
    return [] as QuestionRow[];
  }

  const supabase = createSupabaseAdminClient();
  const responses = await Promise.all(
    chunk(questionIds, 500).map((questionIdChunk) =>
      supabase
        .from("questions")
        .select("id,section_id,position,question_type,difficulty,domain,skill,updated_at")
        .in("id", questionIdChunk),
    ),
  );

  const rows: QuestionRow[] = [];
  for (const response of responses) {
    if (response.error) {
      throw new TestManagerCatalogError(500, response.error.message);
    }

    rows.push(...((response.data ?? []) as QuestionRow[]));
  }

  return rows;
}

async function getOptionMatchedQuestionIds(query: string) {
  if (!query) {
    return [] as string[];
  }

  const supabase = createSupabaseAdminClient();
  const matches = await fetchAllPaginated<OptionMatchRow>((from, to) =>
    supabase.from("question_options").select("question_id").ilike("option_text", `%${query}%`).range(from, to),
  );

  return Array.from(new Set(matches.map((item) => item.question_id)));
}

function uniqueQuestions(rows: QuestionRow[]) {
  const map = new Map<string, QuestionRow>();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return Array.from(map.values());
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function toCatalogRows(questions: QuestionRow[], testsById: Map<string, PublicTestRow>, sectionsById: Map<string, SectionRow>) {
  return questions
    .map((question) => {
      const section = sectionsById.get(question.section_id);
      const test = section ? testsById.get(section.test_id) : null;
      if (!section || !test) {
        return null;
      }

      const row: TestManagerCatalogRow = {
        questionId: question.id,
        testId: test.id,
        testTitle: test.title,
        section: section.name,
        module: section.module_number,
        questionNumber: question.position,
        questionType: question.question_type,
        difficulty: question.difficulty,
        updatedAt: question.updated_at,
      };

      if (question.domain) {
        row.domain = question.domain;
      }

      if (question.skill) {
        row.skill = question.skill;
      }

      return row;
    })
    .filter(isDefined);
}

export const testManagerCatalogService = {
  async getPage(options: CatalogQueryOptions, session: AppSession): Promise<TestManagerCatalogPage> {
    requirePublicExamEditor(session);

    const query = options.query?.trim() ?? "";
    const searchScope = normalizeSearchScope(options.searchScope);
    const sort = normalizeSortOption(options.sort);
    const offset = normalizeOffset(options.offset);
    const limit = normalizeLimit(options.limit);
    const questionNumber = isNumericQuery(query) ? Number.parseInt(query, 10) : undefined;

    const tests = await getPublicTests();
    const testsById = new Map(tests.map((test) => [test.id, test]));
    const sections = await getSectionsForTests(tests.map((test) => test.id));
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    const sectionIds = sections.map((section) => section.id);
    const matchedTitleTestIds =
      searchScope === "testTitle" && query
        ? new Set(tests.filter((test) => test.title.toLowerCase().includes(query.toLowerCase())).map((test) => test.id))
        : null;
    const matchedSectionIds = matchedTitleTestIds
      ? sections.filter((section) => matchedTitleTestIds.has(section.test_id)).map((section) => section.id)
      : sectionIds;

    let matchedQuestions: QuestionRow[] = [];

    if (!query || searchScope === "testTitle") {
      matchedQuestions = await getQuestionsBySectionIds(matchedSectionIds);
    } else if (searchScope === "passage") {
      matchedQuestions = await getQuestionsBySectionIds(sectionIds, { passageQuery: query });
    } else {
      const optionMatchedQuestionIds = await getOptionMatchedQuestionIds(query);
      const optionMatchedQuestions = await getQuestionsByIds(optionMatchedQuestionIds);
      const publicSectionIdSet = new Set(sectionIds);
      matchedQuestions = optionMatchedQuestions.filter((question) => publicSectionIdSet.has(question.section_id));
    }

    if (typeof questionNumber === "number") {
      const questionNumberMatches = await getQuestionsBySectionIds(sectionIds, { questionNumber });
      matchedQuestions = uniqueQuestions([...matchedQuestions, ...questionNumberMatches]);
    }

    const rows = toCatalogRows(uniqueQuestions(matchedQuestions), testsById, sectionsById).sort((left, right) =>
      compareCatalogRows(left, right, sort),
    );

    const pagedRows = rows.slice(offset, offset + limit);

    return {
      rows: pagedRows,
      total: rows.length,
      offset,
      limit,
      nextOffset: offset + pagedRows.length,
      hasMore: offset + pagedRows.length < rows.length,
    };
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
