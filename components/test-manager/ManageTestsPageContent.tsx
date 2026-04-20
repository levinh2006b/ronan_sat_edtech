"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, ChevronLeft, Search } from "lucide-react";

import { CompactPagination } from "@/components/ui/CompactPagination";
import { PaginatedStickyTableShell } from "@/components/ui/PaginatedStickyTableShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchTestManagerCatalogPage } from "@/lib/services/testManagerCatalogClient";
import type { TestManagerCatalogRow, TestManagerCatalogSearchScope, TestManagerCatalogSortOption } from "@/types/testManager";

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
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
      <col className="w-[38%]" />
      <col className="w-[14%]" />
      <col className="w-[12%]" />
      <col className="w-[10%]" />
      <col className="w-[13%]" />
      <col className="w-[13%]" />
    </colgroup>
  );
}

export function ManageTestsPageContent() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [searchScope, setSearchScope] = useState<TestManagerCatalogSearchScope>("testTitle");
  const [sort, setSort] = useState<TestManagerCatalogSortOption>("updated_desc");
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
  }, [deferredQuery, searchScope, sort]);

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
  }, [deferredQuery, searchScope, sort, targetPage]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page || nextPage === pendingPage) {
      return;
    }

    setPendingPage(nextPage);
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

        <section className="workbook-panel-muted shrink-0 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
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
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-fg/70">
            <span className="workbook-sticker bg-surface-white text-ink-fg">{total} matches</span>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink-fg bg-paper-bg px-3 py-1 font-semibold">
              <ArrowDownUp className="h-3.5 w-3.5" />
              Question number matches are included for numeric searches.
            </span>
          </div>
        </section>

        <PaginatedStickyTableShell
          loading={loadingRows}
          hasRows={visibleRows.length > 0}
          loadingLabel="Loading page"
          pagination={totalPages > 1 ? <CompactPagination page={page} totalPages={totalPages} onChange={handlePageChange} /> : null}
        >
          <table className="min-w-[1100px] w-full table-fixed text-sm text-ink-fg">
              <CatalogTableColGroup />
              <thead>
                <tr className="bg-paper-bg">
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Test</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Section</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Question #</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Type</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Difficulty</th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75">Updated</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {visibleRows.length === 0 && loadingRows ? (
                  <tr className="border-b-2 border-ink-fg/15 odd:bg-surface-white even:bg-paper-bg/60">
                    <td colSpan={6} className="px-4 py-16 text-center text-sm font-semibold text-ink-fg/70">
                      <span className="inline-flex items-center gap-2">Loading questions</span>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr className="border-b-2 border-ink-fg/15 odd:bg-surface-white even:bg-paper-bg/60">
                    <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-ink-fg/70">
                      No questions matched this search.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr key={row.questionId} className="border-b-2 border-ink-fg/15 transition-colors odd:bg-surface-white even:bg-paper-bg/60 hover:bg-primary/35">
                      <td className="px-4 py-3 align-middle">
                        <div className="font-semibold text-ink-fg">{row.testTitle}</div>
                        {row.domain || row.skill ? <div className="mt-1 text-xs text-ink-fg/65">{[row.domain, row.skill].filter(Boolean).join(" • ")}</div> : null}
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
