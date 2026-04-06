import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import Result from "@/lib/models/Result";
import Test from "@/lib/models/Test";
import User from "@/lib/models/User";

type SessionUser = {
  id?: string;
  role?: string;
};

type TestLean = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  timeLimit?: number;
};

type ResultLean = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  totalScore?: number;
  readingScore?: number;
  mathScore?: number;
  score?: number;
  date?: Date;
  createdAt?: Date;
};

type DailyCountPoint = {
  dateKey: string;
  label: string;
  tests: number;
};

type DailyMinutesPoint = {
  dateKey: string;
  label: string;
  minutes: number;
};

const ACTIVITY_WINDOWS = [1, 7, 15, 30] as const;
const DAILY_TREND_WINDOWS = [7, 15, 30] as const;
const TIME_TREND_WINDOWS = [1, 7, 15, 30] as const;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatDateKey(date: Date) {
  return startOfDay(date).toISOString().split("T")[0];
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildDailyCountSeries(dates: Date[], window: number): DailyCountPoint[] {
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(today));
  start.setDate(today.getDate() - (window - 1));

  const countMap = new Map<string, number>();

  dates.forEach((date) => {
    const normalized = startOfDay(date);
    if (normalized < start || normalized > today) {
      return;
    }

    const key = formatDateKey(normalized);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  });

  return Array.from({ length: window }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const dateKey = formatDateKey(current);

    return {
      dateKey,
      label: formatShortDate(current),
      tests: countMap.get(dateKey) ?? 0,
    };
  });
}

function buildDailyMinutesSeries(entries: Array<{ date: Date; minutes: number }>, window: number): DailyMinutesPoint[] {
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(today));
  start.setDate(today.getDate() - (window - 1));

  const minutesMap = new Map<string, number>();

  entries.forEach((entry) => {
    const normalized = startOfDay(entry.date);
    if (normalized < start || normalized > today) {
      return;
    }

    const key = formatDateKey(normalized);
    minutesMap.set(key, (minutesMap.get(key) ?? 0) + entry.minutes);
  });

  return Array.from({ length: window }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const dateKey = formatDateKey(current);

    return {
      dateKey,
      label: formatShortDate(current),
      minutes: minutesMap.get(dateKey) ?? 0,
    };
  });
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUser | undefined;

    if (!sessionUser?.id || sessionUser.role !== "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const parent = await User.findById(sessionUser.id)
      .select("childrenIds")
      .lean<{ childrenIds?: mongoose.Types.ObjectId[] } | null>();

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const childId = parent.childrenIds?.[0];

    if (!childId) {
      return NextResponse.json(
        {
          hasChildren: false,
          child: null,
          overview: {
            highestScore: 0,
            testsCompleted: 0,
            activityLast30Days: 0,
            lastActiveAt: null,
          },
          timeSpentByWindow: {},
          scoreHistory: [],
          testsPerDay: {},
          timeSpentPerDay: {},
          recentTests: [],
        },
        { status: 200 }
      );
    }

    const child = await User.findById(childId)
      .select("name email highestScore")
      .lean<{
        _id: mongoose.Types.ObjectId;
        name?: string;
        email: string;
        highestScore?: number;
      } | null>();

    if (!child) {
      return NextResponse.json(
        {
          hasChildren: false,
          child: null,
          overview: {
            highestScore: 0,
            testsCompleted: 0,
            activityLast30Days: 0,
            lastActiveAt: null,
          },
          timeSpentByWindow: {},
          scoreHistory: [],
          testsPerDay: {},
          timeSpentPerDay: {},
          recentTests: [],
        },
        { status: 200 }
      );
    }

    const rawResults = await Result.find({ userId: child._id, isSectional: { $ne: true } })
      .sort({ createdAt: 1 })
      .select("userId testId totalScore readingScore mathScore score date createdAt")
      .lean<ResultLean[]>();

    const testIds = Array.from(new Set(rawResults.map((result) => result.testId?.toString()).filter(Boolean)));

    const tests = await Test.find({ _id: { $in: testIds } })
      .select("title timeLimit")
      .lean<TestLean[]>();

    const testMap = new Map(tests.map((test) => [test._id.toString(), test]));

    const normalizedResults = rawResults.map((result) => {
      const takenAt = new Date(result.createdAt ?? result.date ?? new Date());
      const test = testMap.get(result.testId.toString());

      return {
        id: result._id.toString(),
        takenAt,
        testName: test?.title ?? "Practice Test",
        timeSpentMinutes: test?.timeLimit ?? 0,
        totalScore: result.totalScore ?? result.score ?? 0,
        readingWritingScore: result.readingScore ?? 0,
        mathScore: result.mathScore ?? 0,
      };
    });

    const today = startOfDay(new Date());
    const activityLast30Start = startOfDay(new Date(today));
    activityLast30Start.setDate(today.getDate() - 29);

    const timeSpentByWindow = Object.fromEntries(
      ACTIVITY_WINDOWS.map((window) => {
        const rangeStart = startOfDay(new Date(today));
        rangeStart.setDate(today.getDate() - (window - 1));

        const total = normalizedResults.reduce((sum, result) => {
          if (result.takenAt >= rangeStart && result.takenAt <= endOfDay(today)) {
            return sum + result.timeSpentMinutes;
          }
          return sum;
        }, 0);

        return [String(window), total];
      })
    );

    const testsPerDay = Object.fromEntries(
      DAILY_TREND_WINDOWS.map((window) => [
        String(window),
        buildDailyCountSeries(
          normalizedResults.map((result) => result.takenAt),
          window
        ),
      ])
    );

    const timeSpentPerDay = Object.fromEntries(
      TIME_TREND_WINDOWS.map((window) => [
        String(window),
        buildDailyMinutesSeries(
          normalizedResults.map((result) => ({
            date: result.takenAt,
            minutes: result.timeSpentMinutes,
          })),
          window
        ),
      ])
    );

    const scoreHistory = normalizedResults.map((result) => ({
      id: result.id,
      dateKey: formatDateKey(result.takenAt),
      label: formatShortDate(result.takenAt),
      total: result.totalScore,
      math: result.mathScore,
      rw: result.readingWritingScore,
      takenAt: result.takenAt.toISOString(),
    }));

    const recentTests = normalizedResults
      .slice()
      .reverse()
      .map((result) => ({
        id: result.id,
        testName: result.testName,
        takenAt: result.takenAt.toISOString(),
        dateLabel: result.takenAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        timeLabel: result.takenAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        readingWritingScore: result.readingWritingScore,
        mathScore: result.mathScore,
        totalScore: result.totalScore,
      }));

    const lastActiveAt =
      normalizedResults.length > 0 ? normalizedResults[normalizedResults.length - 1].takenAt.toISOString() : null;

    return NextResponse.json(
      {
        hasChildren: true,
        child: {
          id: child._id.toString(),
          name: child.name ?? "Student",
          email: child.email,
        },
        overview: {
          highestScore: Math.max(child.highestScore ?? 0, ...normalizedResults.map((result) => result.totalScore), 0),
          testsCompleted: normalizedResults.length,
          activityLast30Days: normalizedResults.filter((result) => result.takenAt >= activityLast30Start).length,
          lastActiveAt,
        },
        timeSpentByWindow,
        scoreHistory,
        testsPerDay,
        timeSpentPerDay,
        recentTests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/parent/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load parent dashboard" }, { status: 500 });
  }
}
