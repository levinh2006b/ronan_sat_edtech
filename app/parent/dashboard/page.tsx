"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowRight, CalendarRange, ChevronLeft, ChevronRight, Trophy, Users } from "lucide-react";

import ActivityHeatmap from "@/components/ActivityHeatmap";

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

type ScoreDisplayOption = "rw" | "math" | "total";
type TimeWindow = 1 | 7 | 15 | 30;
type DailyTrendWindow = 7 | 15 | 30;

const SCORE_OPTIONS: Array<{ key: ScoreDisplayOption; label: string; color: string }> = [
  { key: "rw", label: "Reading & Writing", color: "#0f766e" },
  { key: "math", label: "Math", color: "#1d4ed8" },
  { key: "total", label: "Total", color: "#7c2d12" },
];

const TIME_WINDOW_OPTIONS: TimeWindow[] = [1, 7, 15, 30];
const DAILY_TREND_OPTIONS: DailyTrendWindow[] = [7, 15, 30];
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
    <div className="flex h-[20rem] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  );
}

function ScoreHistoryChart({
  data,
  selectedMetric,
  onSelectMetric,
}: {
  data: ScoreHistoryPoint[];
  selectedMetric: ScoreDisplayOption;
  onSelectMetric: (value: ScoreDisplayOption) => void;
}) {
  if (data.length === 0) {
    return <ChartEmptyState message="No full-length test scores yet." />;
  }

  const width = Math.max(640, data.length * 72);
  const height = 240;
  const leftPadding = 56;
  const rightPadding = 18;
  const topPadding = 20;
  const bottomPadding = 56;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  const minValue = 400;
  const maxValue = 1600;
  const yAxisTicks = [400, 700, 1000, 1300, 1600];
  const selectedOption = SCORE_OPTIONS.find((option) => option.key === selectedMetric) ?? SCORE_OPTIONS[0];
  const values = data.map((point) => Math.max(0, point[selectedMetric]));
  const labelIndexes = getVisibleLabelIndexes(data.length);

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SCORE_OPTIONS.map((option) => {
            const active = option.key === selectedMetric;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelectMetric(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                style={active ? { backgroundColor: option.color } : undefined}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="text-sm text-slate-500">Range fixed at 400-1600</div>
      </div>

      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[19rem] min-w-full">
          {yAxisTicks.map((tick) => {
            const y = topPadding + chartHeight - ((tick - minValue) / (maxValue - minValue)) * chartHeight;
            return (
              <g key={tick}>
                <line x1={leftPadding} y1={y} x2={width - rightPadding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={leftPadding - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {tick}
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
  selectedWindow: DailyTrendWindow;
  onSelectWindow: (value: DailyTrendWindow) => void;
}) {
  if (data.length === 0) {
    return <ChartEmptyState message="No recent test activity yet." />;
  }

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

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {DAILY_TREND_OPTIONS.map((option) => {
            const active = option === selectedWindow;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelectWindow(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option} days
              </button>
            );
          })}
        </div>
        <div className="text-sm text-slate-500">Tests completed per day</div>
      </div>

      <div className="overflow-x-auto pb-2">
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
  selectedWindow: TimeWindow;
  onSelectWindow: (value: TimeWindow) => void;
  selectedTotalMinutes: number;
}) {
  if (data.length === 0) {
    return <ChartEmptyState message="No recent study time yet." />;
  }

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

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Minutes spent per day</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{formatMinutes(selectedTotalMinutes)}</div>
          <div className="mt-1 text-sm text-slate-500">
            {selectedWindow === 1 ? "Today" : `Total in the last ${selectedWindow} days`}
          </div>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
          Daily study time
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
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
        {TIME_WINDOW_OPTIONS.map((option) => {
          const active = option === selectedWindow;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelectWindow(option)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {option === 1 ? "Today" : `${option} days`}
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
    <div className="min-w-[15rem] flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:max-w-[18rem]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accentClass}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  const [data, setData] = useState<ParentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedScoreMetric, setSelectedScoreMetric] = useState<ScoreDisplayOption>("total");
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TimeWindow>(30);
  const [selectedDailyTrendWindow, setSelectedDailyTrendWindow] = useState<DailyTrendWindow>(30);
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

    fetchDashboard();

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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_35%,_#ffffff_75%)] px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Unable to load the Parent Portal</h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link
            href="/auth/parent"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            Return to Parent Link Page
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!data?.hasChildren) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_40%,_#ffffff_78%)] px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200/70 bg-white/90 p-10 shadow-xl shadow-slate-200/50 backdrop-blur">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Users className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Parent Portal</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              You have not linked a child account yet. Link your child&apos;s account to see scores, study
              activity, and recent test history.
            </p>
            <Link
              href="/auth/parent"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700"
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
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f8fafc_100%)] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Parent Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {data.child?.name ? `${data.child.name}'s Progress Dashboard` : "Student Progress Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{data.child?.email}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-6 flex flex-wrap gap-4">
          <StatCard
            title="Highest Score"
            value={data.overview.highestScore}
            subtitle="Best total score recorded"
            icon={<Trophy className="h-5 w-5 text-amber-700" />}
            accentClass="bg-amber-100"
          />
          <StatCard
            title="Activity Last 30 Days"
            value={data.overview.activityLast30Days}
            subtitle="Practice tests completed recently"
            icon={<CalendarRange className="h-5 w-5 text-sky-700" />}
            accentClass="bg-sky-100"
          />
          <StatCard
            title="Tests Completed"
            value={data.overview.testsCompleted}
            subtitle="All completed full-length tests"
            icon={<Activity className="h-5 w-5 text-emerald-700" />}
            accentClass="bg-emerald-100"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(21rem,0.95fr)]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Score History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Switch between Reading and Writing, Math, and Total without stacking all three on one chart.
              </p>
            </div>
            <ScoreHistoryChart
              data={data.scoreHistory}
              selectedMetric={selectedScoreMetric}
              onSelectMetric={setSelectedScoreMetric}
            />
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm xl:ml-auto xl:w-full xl:max-w-[24rem]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Activity Last 30 Days</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Heatmap of daily study activity across the most recent 30 days.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">30 days</div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
              <ActivityHeatmap results={heatmapResults} />
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Last active:{" "}
              <span className="font-semibold text-slate-900">
                {data.overview.lastActiveAt
                  ? new Date(data.overview.lastActiveAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "No activity yet"}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Test Volume Trend</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review how the number of tests completed changes day by day across 7, 15, or 30 days.
              </p>
            </div>
            <DailyTestsChart
              data={data.testsPerDay[String(selectedDailyTrendWindow)] ?? []}
              selectedWindow={selectedDailyTrendWindow}
              onSelectWindow={setSelectedDailyTrendWindow}
            />
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Time Spent Trend</h2>
              <p className="mt-1 text-sm text-slate-500">
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

        <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Test History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing 10 tests per page with date, time, section scores, and total score.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-sm font-semibold text-slate-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Reading & Writing</th>
                  <th className="px-4 py-3">Math</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTests.length > 0 ? (
                  paginatedTests.map((item) => (
                    <tr key={item.id} className="text-sm text-slate-700">
                      <td className="px-4 py-4 whitespace-nowrap">{item.dateLabel}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{item.timeLabel}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{item.testName}</td>
                      <td className="px-4 py-4">{item.readingWritingScore}</td>
                      <td className="px-4 py-4">{item.mathScore}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{item.totalScore}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      No test history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
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
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
