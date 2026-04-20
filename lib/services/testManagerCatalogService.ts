import type { AppSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TestManagerCatalogPage, TestManagerCatalogSearchScope, TestManagerCatalogSortOption } from "@/types/testManager";

const PUBLIC_EXAM_EDIT_PERMISSION = "edit_public_exams";

type CatalogQueryOptions = {
  query?: string;
  searchScope?: TestManagerCatalogSearchScope;
  sort?: TestManagerCatalogSortOption;
  offset?: number;
  limit?: number;
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

export const testManagerCatalogService = {
  async getPage(options: CatalogQueryOptions, session: AppSession): Promise<TestManagerCatalogPage> {
    requirePublicExamEditor(session);

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("get_test_manager_catalog_page", {
      search_query: options.query?.trim() ?? "",
      search_scope: normalizeSearchScope(options.searchScope),
      sort_option: normalizeSortOption(options.sort),
      page_offset: normalizeOffset(options.offset),
      page_limit: normalizeLimit(options.limit),
    });

    if (error || !data) {
      throw new TestManagerCatalogError(500, error?.message ?? "Failed to load test manager catalog.");
    }

    return data as TestManagerCatalogPage;
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
