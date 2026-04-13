"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowRight, CalendarRange, ChevronLeft, ChevronRight, Trophy, Users } from "lucide-react";

import ActivityHeatmap from "@/components/ActivityHeatmap";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import LeaderboardTableSkeleton from "@/components/dashboard/LeaderboardTableSkeleton";
import type { LeaderboardEntry } from "@/types/testLibrary";

type Overview = {
  highestScore: number;
  testsCompleted: number;
  activityLast30Days: number;
  lastActiveAt: string | null;
};

type ScoreHistoryPoint = {
  id: string;
  dateKey: string;
  label: string;
  total: number;
  math: number;
  rw: number;
  takenAt: string;
};

type TestsPerDayPoint = {
  dateKey: string;
  label: string;
  tests: number;
};

type TimeSpentPerDayPoint = {
  dateKey: string;
  label: string;
  minutes: number;
};

type RecentTestItem = {
  id: string;
  testName: string;
  takenAt: string;
  dateLabel: string;
  timeLabel: string;
  readingWritingScore: number;
  mathScore: number;
  totalScore: number;
};

type ParentDashboardResponse = {
  hasChildren: boolean;
  child: {
    id: string;
    name: string;
    email: string;
  } | null;
  overview: Overview;
  timeSpentByWindow: Record<string, number>;
  scoreHistory: ScoreHistoryPoint[];
  testsPerDay: Record<string, TestsPerDayPoint[]>;
  timeSpentPerDay: Record<string, TimeSpentPerDayPoint[]>;
  recentTests: RecentTestItem[];
  error?: string;
};

type LeaderboardResponse = {
  leaderboard?: LeaderboardEntry[];
  error?: string;
};

type ScoreDisplayOption = "rw" | "math" | "total";
type TrendWindow = 7 | 15 | 30;

const SCORE_OPTIONS: Array<{ key: ScoreDisplayOption; label: string; color: string }> = [
  { key: "rw", label: "Reading & Writing", color: "#0f766e" },
  { key: "math", label: "Math", color: "#1d4ed8" },
  { key: "total", label: "Total", color: "#7c2d12" },
];

const TREND_WINDOW_OPTIONS: TrendWindow[] = [7, 15, 30];
const TESTS_PER_PAGE = 10;

function DashboardSkeleton() {
  return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-3xl bg-slate-200/70" />
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 min-w-[15rem] flex-1 rounded-3xl bg-slate-200/70 xl:max-w-[18rem]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(21rem,0.95fr)]">
        <div className="h-[28rem] rounded-3xl bg-slate-200/70" />
        <div className="h-[28rem] rounded-3xl bg-slate-200/70 xl:ml-auto xl:w-full xl:max-w-[24rem]" />
      </div>
      <div className="h-[24rem] rounded-3xl bg-slate-200/70" />
      <div className="h-[26rem] rounded-3xl bg-slate-200/70" />
      <div className="h-[30rem] rounded-3xl bg-slate-200/70" />
    </div>
  );
}

function formatMinutes(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatMinuteAxisLabel(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = totalMinutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function buildLinePath(values: number[], chartWidth: number, chartHeight: number, minValue: number, maxValue: number) {
  if (values.length === 0) {
    return "";
  }

  const valueRange = Math.max(1, maxValue - minValue);
  const getX = (index: number) => (values.length === 1 ? chartWidth / 2 : (index / (values.length - 1)) * chartWidth);
  const getY = (value: number) => chartHeight - ((value - minValue) / valueRange) * chartHeight;

  return values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(value)}`)
    .join(" ");
}

function buildAreaPath(values: number[], chartWidth: number, chartHeight: number, maxValue: number) {
  if (values.length === 0) {
    return "";
  }

  const getX = (index: number) => (values.length === 1 ? chartWidth / 2 : (index / (values.length - 1)) * chartWidth);
  const getY = (value: number) => chartHeight - (value / Math.max(1, maxValue)) * chartHeight;
  const firstX = getX(0);
  const lastX = getX(values.length - 1);

  const line = values.map((value, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(value)}`).join(" ");

  return `${line} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;
}

function getVisibleLabelIndexes(length: number) {
  if (length <= 7) {
    return new Set(Array.from({ length }, (_, index) => index));
  }

  if (length <= 15) {
    return new Set(Array.from({ length }, (_, index) => index).filter((index) => index % 2 === 0 || index === length - 1));
  }

  return new Set(Array.from({ length }, (_, index) => index).filter((index) => index % 3 === 0 || index === length - 1));
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[20rem] items-center justify-center rounded-3xl border-2 border-dashed border-ink-fg bg-paper-bg text-sm text-ink-fg/70">
      {message}
    </div>
  );
}

function ScoreHistoryChart({
  data,
  selectedMetric,
  selectedWindow,
  onSelectMetric,
  onSelectWindow,
}: {
  data: ScoreHistoryPoint[];
  selectedMetric: ScoreDisplayOption;
  selectedWindow: TrendWindow;
  onSelectMetric: (value: ScoreDisplayOption) => void;
  onSelectWindow: (value: TrendWindow) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const width = Math.max(640, data.length * 72);
  const height = 260;
  const leftPadding = 56;
  const rightPadding = 18;
  const topPadding = 20;
  const bottomPadding = 68;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  const scoreRange =
    selectedMetric === "total"
      ? { min: 400, max: 1600, ticks: [400, 700, 1000, 1300, 1600], label: "Range fixed at 400-1600" }
      : { min: 0, max: 800, ticks: [0, 200, 350, 500, 650, 800], label: "Range fixed at 200-800" };
  const minValue = scoreRange.min;
  const maxValue = scoreRange.max;
  const yAxisTicks = scoreRange.ticks;
  const selectedOption = SCORE_OPTIONS.find((option) => option.key === selectedMetric) ?? SCORE_OPTIONS[0];
  const values = data.map((point) => Math.max(0, point[selectedMetric]));
  const labelIndexes = getVisibleLabelIndexes(data.length);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || selectedWindow !== 30) {
      return;
    }

    container.scrollLeft = container.scrollWidth;
  }, [data.length, selectedWindow, selectedMetric]);

  if (data.length === 0) {
    return <ChartEmptyState message="No full-length test scores yet." />;
  }

  return (
    <div className="rounded-3xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="grid gap-3 md:grid-cols-2 xl:max-w-3xl xl:flex-1">
          <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-fg/70">Display Score</p>
            <div className="flex flex-wrap gap-2">
              {SCORE_OPTIONS.map((option) => {
                const active = option.key === selectedMetric;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onSelectMetric(option.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "text-white shadow-sm" : "bg-paper-bg text-ink-fg"
                    }`}
                    style={active ? { backgroundColor: option.color } : undefined}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-fg/70">Time Range</p>
            <div className="flex flex-wrap gap-2">
              {TREND_WINDOW_OPTIONS.map((option) => {
                const active = option === selectedWindow;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSelectWindow(option)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-ink-fg text-white shadow-sm" : "bg-paper-bg text-ink-fg"
                    }`}
                  >
                    {option} days
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-sm text-ink-fg/70">{scoreRange.label}</div>
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[19rem] min-w-full">
          {yAxisTicks.map((tick) => {
            const y = topPadding + chartHeight - ((tick - minValue) / (maxValue - minValue)) * chartHeight;
            return (
              <g key={tick}>
                <line x1={leftPadding} y1={y} x2={width - rightPadding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={leftPadding - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {tick === 0 ? "No test taken" : tick}
                </text>
              </g>
            );
          })}

          <path
            d={buildLinePath(values, chartWidth, chartHeight, minValue, maxValue)}
            transform={`translate(${leftPadding}, ${topPadding})`}
            fill="none"
            stroke={selectedOption.color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((point, index) => {
            const x = leftPadding + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
            const y = topPadding + chartHeight - ((values[index] - minValue) / (maxValue - minValue)) * chartHeight;
            return (
              <g key={point.id}>
                <circle cx={x} cy={y} r="4.5" fill={selectedOption.color} />
                {labelIndexes.has(index) ? (
                  <text x={x} y={height - 18} textAnchor="middle" fontSize="11" fill="#64748b">
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DailyTestsChart({
  data,
  selectedWindow,
  onSelectWindow,
}: {
  data: TestsPerDayPoint[];
  selectedWindow: TrendWindow;
  onSelectWindow: (value: TrendWindow) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const width = Math.max(620, data.length * 56);
  const height = 220;
  const leftPadding = 44;
  const rightPadding = 18;
  const topPadding = 20;
  const bottomPadding = 52;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  const maxValue = Math.max(3, ...data.map((point) => point.tests));
  const yAxisTicks = Array.from({ length: maxValue + 1 }, (_, index) => index).filter((value) => value <= 5 || value === maxValue);
  const labelIndexes = getVisibleLabelIndexes(data.length);
  const values = data.map((point) => point.tests);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || selectedWindow !== 30) {
      return;
    }

    container.scrollLeft = container.scrollWidth;
  }, [data.length, selectedWindow]);

  if (data.length === 0) {
    return <ChartEmptyState message="No recent test activity yet." />;
  }

  return (
    <div className="rounded-3xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TREND_WINDOW_OPTIONS.map((option) => {
            const active = option === selectedWindow;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelectWindow(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-ink-fg text-white shadow-sm" : "bg-surface-white text-ink-fg"
                }`}
              >
                {option} days
              </button>
            );
          })}
        </div>
        <div className="text-sm text-ink-fg/70">Tests completed per day</div>
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[17rem] min-w-full">
          {yAxisTicks.map((tick) => {
            const y = topPadding + chartHeight - (tick / Math.max(1, maxValue)) * chartHeight;
            return (
              <g key={tick}>
                <line x1={leftPadding} y1={y} x2={width - rightPadding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={leftPadding - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {tick}
                </text>
              </g>
            );
          })}

          <path
            d={buildAreaPath(values, chartWidth, chartHeight, maxValue)}
            transform={`translate(${leftPadding}, ${topPadding})`}
            fill="rgba(14, 116, 144, 0.14)"
          />

          <path
            d={buildLinePath(values, chartWidth, chartHeight, 0, maxValue)}
            transform={`translate(${leftPadding}, ${topPadding})`}
            fill="none"
            stroke="#0f766e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((point, index) => {
            const x = leftPadding + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
            const y = topPadding + chartHeight - (point.tests / Math.max(1, maxValue)) * chartHeight;
            return (
              <g key={point.dateKey}>
                <circle cx={x} cy={y} r="4" fill="#0f766e" />
                {labelIndexes.has(index) ? (
                  <text x={x} y={height - 16} textAnchor="middle" fontSize="11" fill="#64748b">
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function TimeSpentChart({
  data,
  selectedWindow,
  onSelectWindow,
  selectedTotalMinutes,
}: {
  data: TimeSpentPerDayPoint[];
  selectedWindow: TrendWindow;
  onSelectWindow: (value: TrendWindow) => void;
  selectedTotalMinutes: number;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const width = Math.max(720, data.length * 56);
  const height = 220;
  const leftPadding = 48;
  const rightPadding = 18;
  const topPadding = 20;
  const bottomPadding = 52;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  const maxValue = Math.max(30, ...data.map((point) => point.minutes));
  const yAxisTicks = [0, Math.round(maxValue / 3), Math.round((maxValue * 2) / 3), maxValue]
    .filter((tick, index, arr) => tick >= 0 && arr.indexOf(tick) === index)
    .sort((a, b) => a - b);
  const labelIndexes = getVisibleLabelIndexes(data.length);
  const values = data.map((point) => point.minutes);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || selectedWindow !== 30) {
      return;
    }

    container.scrollLeft = container.scrollWidth;
  }, [data.length, selectedWindow]);

  if (data.length === 0) {
    return <ChartEmptyState message="No recent study time yet." />;
  }

  return (
    <div className="rounded-3xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-ink-fg/70">Minutes spent per day</div>
          <div className="mt-2 font-display text-3xl font-black text-ink-fg">{formatMinutes(selectedTotalMinutes)}</div>
          <div className="mt-1 text-sm text-ink-fg/70">{`Total in the last ${selectedWindow} days`}</div>
        </div>
        <div className="workbook-sticker bg-surface-white text-ink-fg">
          Daily study time
        </div>
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[17rem] min-w-full">
          {yAxisTicks.map((tick) => {
            const y = topPadding + chartHeight - (tick / Math.max(1, maxValue)) * chartHeight;
            return (
              <g key={tick}>
                <line x1={leftPadding} y1={y} x2={width - rightPadding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={leftPadding - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {formatMinuteAxisLabel(tick)}
                </text>
              </g>
            );
          })}

          <path
            d={buildAreaPath(values, chartWidth, chartHeight, maxValue)}
            transform={`translate(${leftPadding}, ${topPadding})`}
            fill="rgba(30, 64, 175, 0.14)"
          />

          <path
            d={buildLinePath(values, chartWidth, chartHeight, 0, maxValue)}
            transform={`translate(${leftPadding}, ${topPadding})`}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((point, index) => {
            const x = leftPadding + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
            const y = topPadding + chartHeight - (point.minutes / Math.max(1, maxValue)) * chartHeight;
            return (
              <g key={point.dateKey}>
                <circle cx={x} cy={y} r="4" fill="#1d4ed8" />
                {labelIndexes.has(index) ? (
                  <text x={x} y={height - 16} textAnchor="middle" fontSize="11" fill="#64748b">
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TREND_WINDOW_OPTIONS.map((option) => {
          const active = option === selectedWindow;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelectWindow(option)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-ink-fg text-white shadow-sm" : "bg-surface-white text-ink-fg"
              }`}
            >
              {option} days
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  accentClass: string;
}) {
  return (
    <div className="h-fit min-w-[14rem] flex-1 rounded-3xl border-2 border-ink-fg bg-surface-white p-5 brutal-shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-fg/70">{title}</p>
          <p className="mt-2 font-display text-3xl font-black text-ink-fg">{value}</p>
          <p className="mt-1 text-sm text-ink-fg/70">{subtitle}</p>
        </div>
        <div className={`rounded-2xl border-2 border-ink-fg p-3 brutal-shadow-sm ${accentClass}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  const [data, setData] = useState<ParentDashboardResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedScoreMetric, setSelectedScoreMetric] = useState<ScoreDisplayOption>("total");
  const [selectedScoreWindow, setSelectedScoreWindow] = useState<TrendWindow>(7);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TrendWindow>(7);
  const [selectedDailyTrendWindow, setSelectedDailyTrendWindow] = useState<TrendWindow>(7);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/parent/dashboard", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as ParentDashboardResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Failed to fetch dashboard");
        }

        if (isMounted) {
          setData(payload);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch dashboard");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const fetchLeaderboard = async () => {
      try {
        setLeaderboardLoading(true);

        const response = await fetch("/api/leaderboard", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as LeaderboardResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Failed to fetch leaderboard");
        }

        if (isMounted) {
          setLeaderboard(payload.leaderboard ?? []);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : "Failed to fetch leaderboard");

        if (isMounted) {
          setLeaderboard([]);
        }
      } finally {
        if (isMounted) {
          setLeaderboardLoading(false);
        }
      }
    };

    void fetchDashboard();
    void fetchLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const heatmapResults = useMemo(
    () =>
      (data?.recentTests ?? []).map((item) => ({
        date: item.takenAt,
        createdAt: new Date(item.takenAt),
      })),
    [data]
  );

  const filteredScoreHistory = useMemo(() => {
    const points = data?.scoreHistory ?? [];

    if (points.length <= selectedScoreWindow) {
      return points;
    }

    return points.slice(-selectedScoreWindow);
  }, [data?.scoreHistory, selectedScoreWindow]);

  const totalPages = Math.max(1, Math.ceil((data?.recentTests.length ?? 0) / TESTS_PER_PAGE));

  const paginatedTests = useMemo(() => {
    const tests = data?.recentTests ?? [];
    const start = (currentPage - 1) * TESTS_PER_PAGE;
    return tests.slice(start, start + TESTS_PER_PAGE);
  }, [currentPage, data?.recentTests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data?.recentTests.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-bg px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper-bg px-6 py-10">
        <div className="workbook-panel mx-auto max-w-3xl bg-surface-white p-10 text-center">
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg">Unable to load the dashboard</h1>
          <p className="mt-3 text-ink-fg/70">{error}</p>
          <Link
            href="/dashboard"
            className="workbook-button mt-6 inline-flex items-center gap-2"
          >
            Retry Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!data?.hasChildren) {
    return (
      <div className="min-h-screen bg-paper-bg px-6 py-10">
        <div className="workbook-panel mx-auto max-w-4xl p-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink-fg bg-primary text-ink-fg brutal-shadow-sm">
              <Users className="h-8 w-8" />
            </div>
            <h1 className="font-display text-4xl font-black uppercase tracking-tight text-ink-fg">Parent Dashboard</h1>
            <p className="mt-4 text-base leading-7 text-ink-fg/70">
              You have not linked a child account yet. Link your child&apos;s account to see scores, study
              activity, and recent test history.
            </p>
            <Link
              href="/auth/parent"
              className="workbook-button mt-8 inline-flex items-center gap-2"
            >
              Link a Child Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-bg text-ink-fg">
      <header className="border-b-4 border-ink-fg bg-surface-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="workbook-sticker bg-primary text-ink-fg">Parent Dashboard</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight">
              {data.child?.name ? `${data.child.name}'s Progress Dashboard` : "Student Progress Dashboard"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-fg/70">
              Track score progress, study consistency, test volume, and recent performance without digging through multiple pages.
            </p>
            <p className="mt-1 text-sm text-ink-fg/60">{data.child?.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-[300px]">
            <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 brutal-shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-fg/70">Last Active</div>
              <div className="mt-2 text-sm font-semibold text-ink-fg">
                {data.overview.lastActiveAt ? new Date(data.overview.lastActiveAt).toLocaleDateString() : "No activity yet"}
              </div>
            </div>
            <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 brutal-shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-fg/70">Study Time</div>
              <div className="mt-2 text-sm font-semibold text-ink-fg">
                {formatMinutes(data.timeSpentByWindow[String(selectedTimeWindow)] ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,0.92fr)_minmax(20rem,1.15fr)]">
          <StatCard
            title="Highest Score"
            value={data.overview.highestScore}
            subtitle="Best total score recorded"
            icon={<Trophy className="h-5 w-5 text-amber-700" />}
            accentClass="bg-amber-100"
          />
          <StatCard
            title="Tests Completed"
            value={data.overview.testsCompleted}
            subtitle="All completed full-length tests"
            icon={<Activity className="h-5 w-5 text-emerald-700" />}
            accentClass="bg-emerald-100"
          />
          <div className="workbook-panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink-fg">Activity Last 30 Days</h2>
                <p className="mt-1 text-sm text-ink-fg/70">A quick view of recent study consistency.</p>
              </div>
              <div className="rounded-2xl border-2 border-ink-fg bg-primary p-3 brutal-shadow-sm">
                <CalendarRange className="h-5 w-5 text-ink-fg" />
              </div>
            </div>
            <div className="mt-4 rounded-3xl border-2 border-ink-fg bg-paper-bg px-4 py-5">
              <ActivityHeatmap results={heatmapResults} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
          <div className="workbook-panel p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-ink-fg">Score History</h2>
              <p className="mt-1 text-sm text-ink-fg/70">
                Switch between Reading and Writing, Math, and Total, then focus on the last 7, 15, or 30 days.
              </p>
            </div>
            <ScoreHistoryChart
              data={filteredScoreHistory}
              selectedMetric={selectedScoreMetric}
              selectedWindow={selectedScoreWindow}
              onSelectMetric={setSelectedScoreMetric}
              onSelectWindow={setSelectedScoreWindow}
            />
          </div>

          <div className="workbook-panel p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-ink-fg">Time Spent Trend</h2>
              <p className="mt-1 text-sm text-ink-fg/70">
                See how much time the student spends by day, then switch the summary window below.
              </p>
            </div>
            <TimeSpentChart
              data={data.timeSpentPerDay[String(selectedTimeWindow)] ?? []}
              selectedWindow={selectedTimeWindow}
              onSelectWindow={setSelectedTimeWindow}
              selectedTotalMinutes={data.timeSpentByWindow[String(selectedTimeWindow)] ?? 0}
            />
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="workbook-panel p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-ink-fg">Test Volume Trend</h2>
              <p className="mt-1 text-sm text-ink-fg/70">
                Review how the number of tests completed changes day by day across 7, 15, or 30 days.
              </p>
            </div>
            <DailyTestsChart
              data={data.testsPerDay[String(selectedDailyTrendWindow)] ?? []}
              selectedWindow={selectedDailyTrendWindow}
              onSelectWindow={setSelectedDailyTrendWindow}
            />
          </div>

          <div className="workbook-panel p-6">
            {leaderboardLoading ? <LeaderboardTableSkeleton /> : <LeaderboardTable leaderboard={leaderboard} />}
          </div>
        </section>

        <section className="workbook-panel mt-6 p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-fg">Recent Test History</h2>
              <p className="mt-1 text-sm text-ink-fg/70">
                Showing 10 tests per page with date, time, section scores, and total score.
              </p>
            </div>
            <div className="text-sm text-ink-fg/70">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          <div className="workbook-table overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm font-semibold text-ink-fg">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Reading & Writing</th>
                  <th className="px-4 py-3">Math</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTests.length > 0 ? (
                  paginatedTests.map((item) => (
                    <tr key={item.id} className="text-sm text-ink-fg">
                      <td className="px-4 py-4 whitespace-nowrap">{item.dateLabel}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{item.timeLabel}</td>
                      <td className="px-4 py-4 font-medium text-ink-fg">{item.testName}</td>
                      <td className="px-4 py-4">{item.readingWritingScore}</td>
                      <td className="px-4 py-4">{item.mathScore}</td>
                      <td className="px-4 py-4 font-semibold text-ink-fg">{item.totalScore}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-fg/70">
                      No test history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink-fg/70">
              {(data.recentTests.length ?? 0) > 0
                ? `Showing ${(currentPage - 1) * TESTS_PER_PAGE + 1}-${Math.min(
                    currentPage * TESTS_PER_PAGE,
                    data.recentTests.length
                  )} of ${data.recentTests.length} tests`
                : "Showing 0 results"}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="workbook-button workbook-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="workbook-button workbook-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
