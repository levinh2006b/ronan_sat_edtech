"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";

import { CompactPagination } from "@/components/ui/CompactPagination";
import { PaginatedStickyTableShell } from "@/components/ui/PaginatedStickyTableShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TokenLockManager } from "@/components/test-manager/TokenLockManager";
import { formatAppDateTime } from "@/lib/dateFormat";
import { fetchTestManagerCatalogPage } from "@/lib/services/testManagerCatalogClient";
import type { TestManagerCatalogRow, TestManagerCatalogSearchScope, TestManagerCatalogSortOption, TestManagerReviewFilter } from "@/types/testManager";

const PAGE_SIZE = 20;

const SEARCH_SCOPE_OPTIONS: Array<{ value: TestManagerCatalogSearchScope; label: string }> = [
  { value: "testTitle", label: "Test name" },
  { value: "passage", label: "Within passage" },
  { value: "options", label: "Within options" },
];

const SORT_OPTIONS: Array<{ value: TestManagerCatalogSortOption; label: string }> = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "updated_asc", label: "Oldest updated" },
  { value: "test_asc", label: "Test name A-Z" },
  { value: "test_desc", label: "Test name Z-A" },
  { value: "question_asc", label: "Question # low-high" },
  { value: "question_desc", label: "Question # high-low" },
];

const REVIEW_FILTER_OPTIONS: Array<{ value: TestManagerReviewFilter; label: string }> = [
  { value: "all", label: "All questions" },
  { value: "has_figure_or_table", label: "Has graph/table" },
  { value: "keyword_needs_figure", label: "Keywords need check" },
  { value: "visual_reference_keyword", label: "Visual-reference keyword" },
  { value: "orphan_visual", label: "Orphan visual" },
  { value: "broken_csv_table", label: "Broken CSV table" },
  { value: "markdown_table_payload", label: "Markdown table payload" },
  { value: "bad_extra_payload", label: "Bad figure payload" },
  { value: "math_dollar_latex", label: "Math dollar LaTeX" },
  { value: "missing_math_delimiters", label: "Missing math delimiters" },
  { value: "rhetorical_notes_format", label: "Rhetorical notes" },
  { value: "has_keyword_any", label: "Any graph/table keyword" },
];

const REVIEW_FLAG_LABELS: Record<string, string> = {
  has_figure_or_table: "Figure",
  keyword_needs_figure: "Missing figure",
  keyword_manual_check: "Manual keyword",
  markdown_table_payload: "Markdown table",
  bad_extra_payload: "Bad extra",
  math_dollar_latex: "Math $",
  missing_math_delimiters: "Naked LaTeX",
  rhetorical_notes_format: "Notes",
  keyword_with_shared_figure: "Shared figure",
  visual_reference_keyword: "Visual phrase",
  broken_csv_table: "Broken CSV",
  orphan_visual: "Orphan visual",
};

const SUSPICION_LEVEL_LABELS: Record<string, { label: string; className: string }> = {
  tier1: { label: "Tier 1 · Missing", className: "bg-accent-3 text-white" },
  tier2: { label: "Tier 2 · Mismatch", className: "bg-primary text-ink-fg" },
  tier3: { label: "Tier 3 · General", className: "bg-surface-white text-ink-fg" },
};

function getSearchPlaceholder(scope: TestManagerCatalogSearchScope) {
  switch (scope) {
    case "passage":
      return "Search within passage or question #";
    case "options":
      return "Search within options or question #";
    default:
      return "Search test name or question #";
  }
}

function formatUpdatedAt(value: string) {
  return formatAppDateTime(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDifficultyClassName(difficulty: TestManagerCatalogRow["difficulty"]) {
  switch (difficulty) {
    case "easy":
      return "bg-primary text-ink-fg";
    case "hard":
      return "bg-accent-3 text-white";
    default:
      return "bg-accent-2 text-white";
  }
}

function getQuestionTypeLabel(type: TestManagerCatalogRow["questionType"]) {
  return type === "spr" ? "SPR" : "MCQ";
}

function CatalogTableColGroup() {
  return (
    <colgroup>
      <col className="w-[30%]" />
      <col className="w-[11%]" />
      <col className="w-[9%]" />
      <col className="w-[8%]" />
      <col className="w-[10%]" />
      <col className="w-[12%]" />
      <col className="w-[16%]" />
      <col className="w-[14%]" />
    </colgroup>
  );
}

export function ManageTestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [searchScope, setSearchScope] = useState<TestManagerCatalogSearchScope>("testTitle");
  const [sort, setSort] = useState<TestManagerCatalogSortOption>("updated_desc");
  const [reviewFilter, setReviewFilter] = useState<TestManagerReviewFilter>((searchParams.get("reviewFilter") as TestManagerReviewFilter | null) ?? "all");
  const [hideTier3, setHideTier3] = useState(searchParams.get("hideTier3") === "1");
  const [page, setPage] = useState(1);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [rows, setRows] = useState<TestManagerCatalogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const previousRowsRef = useRef<TestManagerCatalogRow[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const targetPage = pendingPage ?? page;
  const visibleRows = useMemo(() => {
    if (rows.length > 0) {
      return rows;
    }

    if (loadingRows && previousRowsRef.current.length > 0) {
      return previousRowsRef.current;
    }

    return rows;
  }, [loadingRows, rows]);

  useEffect(() => {
    setPage(1);
    setPendingPage(null);
  }, [deferredQuery, searchScope, sort, reviewFilter, hideTier3]);

  useEffect(() => {
    if (targetPage > totalPages) {
      setPage(totalPages);
      setPendingPage(null);
    }
  }, [targetPage, totalPages]);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoadingRows(true);

      try {
        const catalogPage = await fetchTestManagerCatalogPage({
          query: deferredQuery,
          searchScope,
          sort,
          reviewFilter,
          hideTier3,
          offset: (targetPage - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        });

        if (cancelled) {
          return;
        }

        setRows(catalogPage.rows);
        previousRowsRef.current = catalogPage.rows;
        setTotal(catalogPage.total);
        setPage(targetPage);
        setPendingPage(null);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingRows(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, searchScope, sort, reviewFilter, hideTier3, targetPage]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page || nextPage === pendingPage) {
      return;
    }

    setPendingPage(nextPage);
  };

  const openQuestion = (questionId: string) => {
    const params = new URLSearchParams({
      queue: reviewFilter,
      query: deferredQuery,
      searchScope,
      sort,
    });
    if (hideTier3) {
      params.set("hideTier3", "1");
    }
    router.push(`/test-manager/questions/${questionId}?${params.toString()}`);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-paper-bg px-4 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1400px] min-w-0 flex-col gap-5">
        <section className="workbook-panel-muted px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="workbook-sticker bg-primary text-ink-fg">Test Manager</div>
              <h1 className="mt-3 font-display text-[28px] font-black uppercase tracking-tight text-ink-fg">Manage Tests</h1>
              <p className="mt-2 text-sm text-ink-fg/70">
                Browse public-test questions with search, sort, and paginated loading. Numeric searches always also match question number.
              </p>
            </div>

            <Link href="/test-manager" className="workbook-button workbook-button-secondary self-start">
              <ChevronLeft className="h-4 w-4" />
              Back to Reports
            </Link>
          </div>
        </section>

        <TokenLockManager />

        <section className="workbook-panel-muted shrink-0 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_240px]">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/70">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-fg/55" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={getSearchPlaceholder(searchScope)} className="workbook-input pl-11" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/70">Search In</span>
              <Select value={searchScope} onValueChange={(value) => setSearchScope(value as TestManagerCatalogSearchScope)}>
                <SelectTrigger className="h-[54px]">
                  <SelectValue placeholder="Search scope" />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_SCOPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/70">Sort</span>
              <Select value={sort} onValueChange={(value) => setSort(value as TestManagerCatalogSortOption)}>
                <SelectTrigger className="h-[54px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/70">Review Queue</span>
              <Select value={reviewFilter} onValueChange={(value) => setReviewFilter(value as TestManagerReviewFilter)}>
                <SelectTrigger className="h-[54px]">
                  <SelectValue placeholder="Review queue" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-fg/70">
            <span className="workbook-sticker bg-surface-white text-ink-fg">{total} matches</span>
            {reviewFilter !== "all" ? <span className="workbook-sticker bg-primary text-ink-fg">{REVIEW_FILTER_OPTIONS.find((option) => option.value === reviewFilter)?.label}</span> : null}
            {reviewFilter === "keyword_needs_figure" ? (
              <button
                type="button"
                onClick={() => setHideTier3((current) => !current)}
                className={`rounded-full border-2 border-ink-fg px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] workbook-press ${hideTier3 ? "bg-accent-3 text-white" : "bg-surface-white text-ink-fg"}`}
              >
                {hideTier3 ? "Showing Tier 1/2" : "Hide Tier 3"}
              </button>
            ) : null}
          </div>
        </section>

        <PaginatedStickyTableShell
          loading={loadingRows}
          hasRows={visibleRows.length > 0}
          loadingLabel="Loading page"
          pagination={totalPages > 1 ? <CompactPagination page={page} totalPages={totalPages} onChange={handlePageChange} /> : null}
        >
          <table className="min-w-[1260px] w-full table-fixed text-sm text-ink-fg">
              <CatalogTableColGroup />
              <thead>
                <tr className="bg-paper-bg">
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Test</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Section</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Question #</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Type</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Difficulty</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Suspicion</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Flags</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Updated</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {visibleRows.length === 0 && loadingRows ? (
                  <tr className="border-b-2 border-ink-fg/15 odd:bg-surface-white even:bg-paper-bg/60">
                    <td colSpan={8} className="px-4 py-16 text-center text-sm font-semibold text-ink-fg/70">
                      <span className="inline-flex items-center gap-2">Loading questions</span>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr className="border-b-2 border-ink-fg/15 odd:bg-surface-white even:bg-paper-bg/60">
                    <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-ink-fg/70">
                      No questions matched this search.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr
                      key={row.questionId}
                      role="link"
                      tabIndex={0}
                      onClick={() => openQuestion(row.questionId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openQuestion(row.questionId);
                        }
                      }}
                      className="cursor-pointer border-b-2 border-ink-fg/15 transition-colors odd:bg-surface-white even:bg-paper-bg/60 hover:bg-primary/35 focus-visible:bg-primary/35 focus-visible:outline-none"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="font-semibold text-ink-fg">{row.testTitle}</div>
                        {row.domain || row.skill ? <div className="mt-1 text-xs text-ink-fg/65">{[row.domain, row.skill].filter(Boolean).join(" • ")}</div> : null}
                        {row.contentSnippet ? <div className="mt-1 line-clamp-2 text-xs leading-5 text-ink-fg/60">{row.contentSnippet}</div> : null}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="font-semibold text-ink-fg">{row.section}</div>
                        <div className="mt-1 text-xs text-ink-fg/65">Module {row.module ?? "--"}</div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="workbook-sticker bg-paper-bg text-ink-fg">Q{row.questionNumber}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="workbook-sticker bg-surface-white text-ink-fg">{getQuestionTypeLabel(row.questionType)}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`workbook-sticker ${getDifficultyClassName(row.difficulty)}`}>{row.difficulty}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {row.suspicionLevel ? (
                          <span className={`rounded-full border-2 border-ink-fg px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${SUSPICION_LEVEL_LABELS[row.suspicionLevel].className}`}>
                            {SUSPICION_LEVEL_LABELS[row.suspicionLevel].label}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-ink-fg/45">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap gap-1.5">
                          {row.reviewFlags.length > 0 ? (
                            row.reviewFlags.slice(0, 4).map((flag) => (
                              <span key={flag} className="rounded-full border-2 border-ink-fg bg-surface-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-ink-fg">
                                {REVIEW_FLAG_LABELS[flag] ?? flag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-semibold text-ink-fg/45">No flags</span>
                          )}
                        </div>
                        {row.matchedKeywords.length > 0 ? (
                          <div className="mt-2 line-clamp-1 text-[11px] text-ink-fg/60">{row.matchedKeywords.slice(0, 3).map((match) => match.keyword).join(", ")}</div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-sm font-semibold text-ink-fg/80">{formatUpdatedAt(row.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
          </table>
        </PaginatedStickyTableShell>
      </div>
    </main>
  );
}
