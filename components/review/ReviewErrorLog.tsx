"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, GripVertical, Plus, Search, X } from "lucide-react";

import { CompactPagination } from "@/components/ui/CompactPagination";
import { PaginatedStickyTableShell } from "@/components/ui/PaginatedStickyTableShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import {
  REVIEW_REASON_COLOR_PRESETS,
  createReviewReasonId,
  getReadableTextColor,
} from "@/lib/reviewReasonCatalog";
import { fetchReviewErrorLogPage, fetchReviewReasonCatalog, saveReviewReasonCatalog } from "@/lib/services/reviewService";
import type { ReviewAnswer, ReviewErrorLogEntry, ReviewErrorLogStatus } from "@/types/review";
import type { ReviewReasonItem } from "@/types/reviewReason";

type ReviewErrorLogProps = {
  testType: "full" | "sectional";
  onViewQuestion: (payload: { resultId: string; testId?: string; answer: ReviewAnswer; questionNumber: number }) => void;
  onUpdateReason: (resultId: string, questionId: string, reason?: string) => Promise<void>;
};

const CUSTOMIZE_REASON_VALUE = "__customize_reason__";
const UNSET_REASON_VALUE = "__unset_reason__";
const FALLBACK_REASON_COLOR = "#F4F1EA";
const ERROR_LOG_PAGE_SIZE = 20;
const ERROR_LOG_CACHE_KEY_PREFIX = "review:error-log";

type ErrorLogCacheState = {
  query: string;
  statusFilter: "all" | ReviewErrorLogStatus;
  rows: ReviewErrorLogEntry[];
  page: number;
  total: number;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
};

type SortColumn = "timestamp" | "questionNumber" | "testTitle" | "domain" | "skill" | "difficulty" | "reason";
type SortDirection = "asc" | "desc";

const DIFFICULTY_SORT_ORDER: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

function getDifficultyTone(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "bg-primary text-ink-fg";
    case "hard":
      return "bg-accent-3 text-white";
    case "medium":
      return "bg-accent-2 text-white";
    default:
      return "bg-paper-bg text-ink-fg";
  }
}

function formatErrorLogTimestamp(value?: string) {
  if (!value) {
    return { dateTimeLabel: "Unknown --" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { dateTimeLabel: "Unknown --" };
  }

  return {
    dateTimeLabel: `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`,
  };
}

function moveReasonItem(items: ReviewReasonItem[], draggedId: string, targetId: string) {
  if (draggedId === targetId) {
    return items;
  }

  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  const [draggedItem] = nextItems.splice(draggedIndex, 1);
  nextItems.splice(targetIndex, 0, draggedItem);
  return nextItems.map((item, index) => ({ ...item, order: index }));
}

function compareTextValues(left?: string, right?: string) {
  return (left ?? "").localeCompare(right ?? "", undefined, { sensitivity: "base" });
}

function compareErrorLogRows(left: ReviewErrorLogEntry, right: ReviewErrorLogEntry, column: SortColumn) {
  switch (column) {
    case "timestamp": {
      const leftTimestamp = left.timestamp ? new Date(left.timestamp).getTime() : Number.NEGATIVE_INFINITY;
      const rightTimestamp = right.timestamp ? new Date(right.timestamp).getTime() : Number.NEGATIVE_INFINITY;
      return leftTimestamp - rightTimestamp;
    }
    case "difficulty": {
      const leftDifficulty = DIFFICULTY_SORT_ORDER[left.difficulty.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
      const rightDifficulty = DIFFICULTY_SORT_ORDER[right.difficulty.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
      if (leftDifficulty !== rightDifficulty) {
        return leftDifficulty - rightDifficulty;
      }

      return compareTextValues(left.difficulty, right.difficulty);
    }
    case "questionNumber":
      return left.questionNumber - right.questionNumber;
    case "testTitle":
      return compareTextValues(left.testTitle, right.testTitle);
    case "domain":
      return compareTextValues(left.domain, right.domain);
    case "skill":
      return compareTextValues(left.skill, right.skill);
    case "reason":
      return compareTextValues(left.reason || "No reason yet", right.reason || "No reason yet");
    default:
      return 0;
  }
}

function ErrorLogColGroup() {
  return (
    <colgroup>
      <col className="w-[15%]" />
      <col className="w-[9%]" />
      <col className="w-[15%]" />
      <col className="w-[17%]" />
      <col className="w-[17%]" />
      <col className="w-[10%]" />
      <col className="w-[17%]" />
    </colgroup>
  );
}

export function ReviewErrorLog({ testType, onViewQuestion, onUpdateReason }: ReviewErrorLogProps) {
  const cacheKey = `${ERROR_LOG_CACHE_KEY_PREFIX}:${testType}`;
  const cachedState = getClientCache<ErrorLogCacheState>(cacheKey);
  const [query, setQuery] = useState(cachedState?.query ?? "");
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewErrorLogStatus>(cachedState?.statusFilter ?? "all");
  const [page, setPage] = useState(cachedState?.page ?? 1);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [rows, setRows] = useState<ReviewErrorLogEntry[]>(cachedState?.rows ?? []);
  const [total, setTotal] = useState(cachedState?.total ?? 0);
  const [loadingRows, setLoadingRows] = useState(!cachedState);
  const [pendingReasonKey, setPendingReasonKey] = useState<string | null>(null);
  const [reasonCatalog, setReasonCatalog] = useState<ReviewReasonItem[]>([]);
  const [isReasonManagerOpen, setIsReasonManagerOpen] = useState(false);
  const [draggedReasonId, setDraggedReasonId] = useState<string | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [savingReasonCatalog, setSavingReasonCatalog] = useState(false);
  const [draftReasonCatalog, setDraftReasonCatalog] = useState<ReviewReasonItem[]>([]);
  const [draftSelectedReasonId, setDraftSelectedReasonId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(cachedState?.sortColumn ?? "timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>(cachedState?.sortDirection ?? "desc");
  const [, startUiTransition] = useTransition();
  const selectedReason = draftSelectedReasonId ? draftReasonCatalog.find((item) => item.id === draftSelectedReasonId) ?? null : null;
  const hasHydratedCachedPageRef = useRef(Boolean(cachedState));
  const previousRowsRef = useRef<ReviewErrorLogEntry[]>(cachedState?.rows ?? []);
  const totalPages = Math.max(1, Math.ceil(total / ERROR_LOG_PAGE_SIZE));
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

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return visibleRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const comparison = compareErrorLogRows(left.row, right.row, sortColumn);
        if (comparison !== 0) {
          return comparison * direction;
        }

        return left.index - right.index;
      })
      .map(({ row }) => row);
  }, [sortColumn, sortDirection, visibleRows]);

  useEffect(() => {
    setClientCache<ErrorLogCacheState>(cacheKey, {
      query,
      statusFilter,
      page,
      rows,
      total,
      sortColumn,
      sortDirection,
    });
  }, [cacheKey, page, query, rows, sortColumn, sortDirection, statusFilter, total]);

  useEffect(() => {
    setPage(1);
    setPendingPage(null);
  }, [deferredQuery, statusFilter, testType]);

  useEffect(() => {
    if (targetPage > totalPages) {
      setPage(totalPages);
      setPendingPage(null);
    }
  }, [targetPage, totalPages]);

  useEffect(() => {
    let cancelled = false;

    const loadReasonCatalog = async () => {
      try {
        const loadedReasons = await fetchReviewReasonCatalog();
        if (cancelled) {
          return;
        }

        setReasonCatalog(loadedReasons);
        setSelectedReasonId((current) => current ?? loadedReasons[0]?.id ?? null);
      } catch (error) {
        console.error(error);
      }
    };

    void loadReasonCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialPage = async () => {
      if (hasHydratedCachedPageRef.current) {
        hasHydratedCachedPageRef.current = false;
        setLoadingRows(false);
        return;
      }

      setLoadingRows(true);

      try {
        const errorLogPage = await fetchReviewErrorLogPage({
          testType,
          status: statusFilter,
          query: deferredQuery,
          offset: (targetPage - 1) * ERROR_LOG_PAGE_SIZE,
          limit: ERROR_LOG_PAGE_SIZE,
        });

        if (cancelled) {
          return;
        }

        setRows(errorLogPage.rows);
        previousRowsRef.current = errorLogPage.rows;
        setTotal(errorLogPage.total);
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

    void loadInitialPage();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, statusFilter, testType, targetPage]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page || nextPage === pendingPage) {
      return;
    }

    setPendingPage(nextPage);
  };

  const persistReasonCatalog = async (nextCatalog: ReviewReasonItem[], previousCatalog = reasonCatalog) => {
    setReasonCatalog(nextCatalog);
    setSavingReasonCatalog(true);

    try {
      const savedCatalog = await saveReviewReasonCatalog(nextCatalog);
      setReasonCatalog(savedCatalog);
      setSelectedReasonId((current) => current ?? savedCatalog[0]?.id ?? null);
    } catch (error) {
      console.error(error);
      setReasonCatalog(previousCatalog);
      window.alert("Could not save your reason list. Please try again.");
    } finally {
      setSavingReasonCatalog(false);
    }
  };

  const openReasonManager = () => {
    setDraftReasonCatalog(reasonCatalog.map((item) => ({ ...item })));
    setDraftSelectedReasonId(selectedReasonId ?? reasonCatalog[0]?.id ?? null);
    startUiTransition(() => setIsReasonManagerOpen(true));
  };

  const getReasonItemByLabel = (label?: string) => {
    if (!label) {
      return null;
    }

    return reasonCatalog.find((item) => item.label === label) ?? null;
  };

  const getReasonSurfaceStyle = (label?: string) => {
    const backgroundColor = getReasonItemByLabel(label)?.color || FALLBACK_REASON_COLOR;
    return {
      backgroundColor,
      color: getReadableTextColor(backgroundColor),
    };
  };

  const handleReasonChange = async (row: ReviewErrorLogEntry, nextValue: string) => {
    if (nextValue === CUSTOMIZE_REASON_VALUE) {
      openReasonManager();
      return;
    }

    const nextReason = nextValue === UNSET_REASON_VALUE ? undefined : nextValue;
    const previousRows = rows;

    setPendingReasonKey(row.key);
    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.key === row.key
          ? {
              ...currentRow,
              reason: nextReason,
              answer: {
                ...currentRow.answer,
                errorReason: nextReason,
              },
            }
          : currentRow,
      ),
    );

    try {
      await onUpdateReason(row.resultId, row.questionId, nextReason);
    } catch (error) {
      console.error(error);
      setRows(previousRows);
      window.alert("Could not save that reason. Please try again.");
    } finally {
      setPendingReasonKey(null);
    }
  };

  const handleSortChange = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === "timestamp" ? "desc" : "asc");
  };

  const getHeaderAriaSort = (column: SortColumn): "ascending" | "descending" | "none" => {
    if (column !== sortColumn) {
      return "none";
    }

    return sortDirection === "asc" ? "ascending" : "descending";
  };

  const renderSortIcon = (column: SortColumn) => {
    if (column !== sortColumn) {
      return <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />;
    }

    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
  };

  const handleDraftAddReason = () => {
    const baseLabel = "New Reason";
    let nextLabel = baseLabel;
    let duplicateIndex = 2;

    while (draftReasonCatalog.some((item) => item.label.toLowerCase() === nextLabel.toLowerCase())) {
      nextLabel = `${baseLabel} ${duplicateIndex}`;
      duplicateIndex += 1;
    }

    const nextReason = {
      id: createReviewReasonId(`${nextLabel}-${Date.now()}`),
      label: nextLabel,
      color: REVIEW_REASON_COLOR_PRESETS[0],
      order: draftReasonCatalog.length,
    } satisfies ReviewReasonItem;

    setDraftReasonCatalog((currentCatalog) => [...currentCatalog, nextReason]);
    setDraftSelectedReasonId(nextReason.id);
  };

  const handleDraftReasonLabelChange = (reasonId: string, label: string) => {
    setDraftReasonCatalog((currentCatalog) =>
      currentCatalog.map((item) => (item.id === reasonId ? { ...item, label: label.slice(0, 40) } : item)),
    );
  };

  const handleDraftReasonColorChange = (reasonId: string, color: string) => {
    setDraftReasonCatalog((currentCatalog) =>
      currentCatalog.map((item) => (item.id === reasonId ? { ...item, color } : item)),
    );
  };

  const handleDraftReasonDrop = (targetReasonId: string) => {
    if (!draggedReasonId || draggedReasonId === targetReasonId) {
      return;
    }

    const nextCatalog = moveReasonItem(draftReasonCatalog, draggedReasonId, targetReasonId);
    setDraggedReasonId(null);
    setDraftReasonCatalog(nextCatalog);
  };

  const handleSaveReasonCatalog = async () => {
    const normalizedCatalog = draftReasonCatalog.map((item, index) => ({
      ...item,
      label: item.label.trim().slice(0, 40) || `New Reason ${index + 1}`,
      order: index,
    }));

    const dedupeSet = new Set<string>();
    for (const item of normalizedCatalog) {
      const key = item.label.toLowerCase();
      if (dedupeSet.has(key)) {
        window.alert("Reason labels must be unique.");
        return;
      }
      dedupeSet.add(key);
    }

    await persistReasonCatalog(normalizedCatalog);
    setSelectedReasonId(draftSelectedReasonId ?? normalizedCatalog[0]?.id ?? null);
    setIsReasonManagerOpen(false);
  };

  if (!loadingRows && rows.length === 0 && !deferredQuery.trim() && statusFilter === "all") {
    return (
      <div className="workbook-panel p-10 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-ink-fg/40" />
        <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">No mistakes logged yet</h2>
        <p className="mt-2 text-sm leading-6 text-ink-fg/70">Complete a test and any wrong or skipped questions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="workbook-panel overflow-hidden">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:gap-3">
          <label className="relative flex w-full min-w-0 items-center lg:w-[26rem] xl:w-[32rem]">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-ink-fg/55" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by ID, test, domain, skill, difficulty, or reason"
              className="w-full rounded-2xl border-2 border-ink-fg bg-surface-white py-3 pl-11 pr-4 text-sm text-ink-fg outline-none brutal-shadow-sm transition-all focus-visible:-translate-x-px focus-visible:-translate-y-px focus-visible:shadow-[3px_3px_0_0_var(--color-ink-fg)]"
            />
          </label>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {[
              { value: "all", label: "All misses" },
              { value: "wrong", label: "Wrong only" },
              { value: "omitted", label: "Skipped only" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value as "all" | ReviewErrorLogStatus)}
                className={[
                  "shrink-0 whitespace-nowrap rounded-full border-2 border-ink-fg px-4 py-2 text-xs font-black uppercase tracking-[0.14em] brutal-shadow-sm workbook-press",
                  statusFilter === option.value ? "bg-primary text-ink-fg" : "bg-surface-white text-ink-fg",
                ].join(" ")}
              >
               {option.label}
               </button>
               ))}
          </div>
        </div>

        </section>

      <PaginatedStickyTableShell
        loading={loadingRows}
        hasRows={visibleRows.length > 0}
        loadingLabel="Loading page"
        pagination={totalPages > 1 ? <CompactPagination page={page} totalPages={totalPages} onChange={handlePageChange} /> : null}
      >
        <table className="min-w-[1100px] w-full table-fixed text-sm text-ink-fg">
              <ErrorLogColGroup />
              <thead>
                <tr className="bg-paper-bg hover:bg-paper-bg">
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle" aria-sort={getHeaderAriaSort("timestamp")}>
                    <button
                      type="button"
                      onClick={() => handleSortChange("timestamp")}
                      className="flex w-full items-center gap-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75 workbook-press"
                    >
                      <span>Time</span>
                      {renderSortIcon("timestamp")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle" aria-sort={getHeaderAriaSort("questionNumber")}>
                    <button
                      type="button"
                      onClick={() => handleSortChange("questionNumber")}
                      className="flex w-full items-center gap-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75 workbook-press"
                    >
                      <span>Question</span>
                      {renderSortIcon("questionNumber")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle" aria-sort={getHeaderAriaSort("testTitle")}>
                    <button
                      type="button"
                      onClick={() => handleSortChange("testTitle")}
                      className="flex w-full items-center gap-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75 workbook-press"
                    >
                      <span>Test</span>
                      {renderSortIcon("testTitle")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle" aria-sort={getHeaderAriaSort("domain")}>
                    <button
                      type="button"
                      onClick={() => handleSortChange("domain")}
                      className="flex w-full items-center gap-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75 workbook-press"
                    >
                      <span>Domain</span>
                      {renderSortIcon("domain")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle" aria-sort={getHeaderAriaSort("skill")}>
                    <button
                      type="button"
                      onClick={() => handleSortChange("skill")}
                      className="flex w-full items-center gap-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75 workbook-press"
                    >
                      <span>Skill</span>
                      {renderSortIcon("skill")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle" aria-sort={getHeaderAriaSort("difficulty")}>
                    <button
                      type="button"
                      onClick={() => handleSortChange("difficulty")}
                      className="flex w-full items-center gap-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75 workbook-press"
                    >
                      <span>Difficulty</span>
                      {renderSortIcon("difficulty")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 h-12 whitespace-nowrap border-b-4 border-ink-fg bg-paper-bg px-4 text-left align-middle" aria-sort={getHeaderAriaSort("reason")}>
                    <button
                      type="button"
                      onClick={() => handleSortChange("reason")}
                      className="flex w-full items-center gap-2 text-left text-[11px] font-black uppercase tracking-[0.16em] text-ink-fg/75 workbook-press"
                    >
                      <span>Reason</span>
                      {renderSortIcon("reason")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {visibleRows.length === 0 && loadingRows ? (
                  <tr className="border-b-2 border-ink-fg/15 odd:bg-surface-white even:bg-paper-bg/60">
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-fg/70">
                      Loading the latest mistakes...
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr className="border-b-2 border-ink-fg/15 odd:bg-surface-white even:bg-paper-bg/60">
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-fg/70">
                      No matching mistakes found for the current search and filter.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => (
                    <tr
                      key={row.key}
                      tabIndex={0}
                      onClick={() => onViewQuestion({ resultId: row.resultId, testId: row.testId, answer: row.answer, questionNumber: row.questionNumber })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onViewQuestion({ resultId: row.resultId, testId: row.testId, answer: row.answer, questionNumber: row.questionNumber });
                        }
                      }}
                      className="cursor-pointer border-b-2 border-ink-fg/15 transition-colors odd:bg-surface-white even:bg-paper-bg/60 hover:bg-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-fg focus-visible:ring-offset-2"
                    >
                      <td className="px-4 py-3 align-middle">
                        <span className="text-sm font-semibold text-ink-fg">{formatErrorLogTimestamp(row.timestamp).dateTimeLabel}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-sm font-semibold text-ink-fg">{row.questionNumber}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="block min-w-0 truncate font-semibold text-ink-fg" title={row.testTitle}>
                          {row.testTitle}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle font-medium">{row.domain}</td>
                      <td className="px-4 py-3 align-middle font-medium text-ink-fg/80">{row.skill}</td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={[
                            "inline-flex rounded-full border-2 border-ink-fg px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                            getDifficultyTone(row.difficulty),
                          ].join(" ")}
                        >
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                          <Select
                            value={row.reason || UNSET_REASON_VALUE}
                            onValueChange={(nextValue) => void handleReasonChange(row, nextValue)}
                            disabled={pendingReasonKey === row.key}
                          >
                            <SelectTrigger
                              className="h-11 min-w-[11rem] rounded-xl px-3 py-2 text-xs font-bold normal-case tracking-normal"
                              style={getReasonSurfaceStyle(row.reason)}
                            >
                              <SelectValue placeholder="Add reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNSET_REASON_VALUE}>No reason yet</SelectItem>
                              {row.reason && !getReasonItemByLabel(row.reason) ? <SelectItem value={row.reason}>{row.reason}</SelectItem> : null}
                              {reasonCatalog.map((reason) => (
                                <SelectItem key={reason.id} value={reason.label}>
                                  <span className="inline-flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full border border-ink-fg/30" style={{ backgroundColor: reason.color }} />
                                    {reason.label}
                                  </span>
                                </SelectItem>
                              ))}
                              <SelectItem value={CUSTOMIZE_REASON_VALUE}>Customise reasons</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
      </PaginatedStickyTableShell>

      {isReasonManagerOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-fg/25 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[1.75rem] border-4 border-ink-fg bg-surface-white brutal-shadow">
            <div className="flex items-start justify-between gap-4 border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
              <div>
                <div className="workbook-sticker bg-accent-1 text-ink-fg">Customise reasons</div>
                <p className="mt-3 text-sm text-ink-fg/70">Reorder your reason list, add custom reasons, and update their colours. Changes sync to your account.</p>
              </div>
              <button
                type="button"
                onClick={() => startUiTransition(() => setIsReasonManagerOpen(false))}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-ink-fg bg-surface-white px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] brutal-shadow-sm workbook-press"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="workbook-scrollbar max-h-[calc(90vh-6.5rem)] overflow-y-auto p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
                <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-fg">Reason order</div>
                        <p className="mt-1 text-sm text-ink-fg/70">Drag items up or down to reorder the dropdown.</p>
                      </div>
                      {savingReasonCatalog ? <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-fg/60">Saving...</span> : null}
                    </div>

                    <button type="button" onClick={handleDraftAddReason} className="mt-4 workbook-button w-full bg-primary text-ink-fg">
                      <Plus className="h-4 w-4" />
                      Add reason
                    </button>

                   <div className="mt-4 flex flex-col gap-2">
                     {draftReasonCatalog.map((item) => {
                       const textColor = getReadableTextColor(item.color);
                       return (
                         <button
                           key={item.id}
                           type="button"
                           draggable
                           onDragStart={() => setDraggedReasonId(item.id)}
                           onDragOver={(event) => event.preventDefault()}
                           onDrop={() => handleDraftReasonDrop(item.id)}
                           onClick={() => {
                             setDraftSelectedReasonId(item.id);
                           }}
                           className={[
                             "flex items-center gap-3 rounded-2xl border-2 border-ink-fg px-3 py-3 text-left",
                             draftSelectedReasonId === item.id ? "bg-primary" : "bg-surface-white",
                           ].join(" ")}
                         >
                           <GripVertical className="h-4 w-4 shrink-0 text-ink-fg/50" />
                          <span className="inline-flex rounded-full border-2 border-ink-fg px-2.5 py-1 text-xs font-black tracking-[0.12em]" style={{ backgroundColor: item.color, color: textColor }}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg p-4">
                  <div className="flex flex-col gap-4">
                    {selectedReason ? (
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-fg">Reason settings</div>
                        <div className="mt-3">
                          <input
                            value={selectedReason.label}
                            onChange={(event) => handleDraftReasonLabelChange(selectedReason.id, event.target.value)}
                            placeholder="Reason label"
                            className="workbook-input min-w-0 w-full"
                          />
                        </div>

                        <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-ink-fg">Colour presets</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {REVIEW_REASON_COLOR_PRESETS.map((preset) => {
                            const isActive = selectedReason.color === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleDraftReasonColorChange(selectedReason.id, preset)}
                                className={[
                                  "h-6 w-12 rounded-full border-2 border-ink-fg transition-transform workbook-press",
                                  isActive ? "ring-2 ring-ink-fg ring-offset-2 ring-offset-paper-bg" : "",
                                ].join(" ")}
                                style={{ backgroundColor: preset }}
                                aria-label={`Choose colour ${preset}`}
                                aria-pressed={isActive}
                              />
                            );
                          })}
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <span className="text-xs font-black uppercase tracking-[0.16em] text-ink-fg">Selected colour</span>
                          <div className="flex items-center gap-2 rounded-2xl border-2 border-ink-fg bg-surface-white px-3 py-2">
                            <span className="h-8 w-10 rounded border-2 border-ink-fg/30" style={{ backgroundColor: selectedReason.color }} />
                            <code className="text-xs font-bold text-ink-fg/70">{selectedReason.color}</code>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                          <button type="button" onClick={() => void handleSaveReasonCatalog()} className="workbook-button bg-primary text-ink-fg" disabled={savingReasonCatalog}>
                            Save reasons
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-ink-fg bg-surface-white p-6 text-sm text-ink-fg/70">
                        Select a reason on the left to edit its label and colour.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
