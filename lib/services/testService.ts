import { PipelineStage, Types } from "mongoose";
import { z } from "zod";

import dbConnect from "@/lib/mongodb";
import Question from "@/lib/models/Question";
import Test from "@/lib/models/Test";
import { getSectionQueryNames, isVerbalSection, MATH_SECTION, VERBAL_SECTION } from "@/lib/sections";
import { TestValidationSchema, type TestInput } from "@/lib/schema/test";

type SortableTestField = "createdAt" | "title";
type TestFilters = {
  period?: string | null;
  subject?: string | null;
};

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPeriodFilter(period?: string | null) {
  if (!period || period === "All") {
    return {};
  }

  if (period === "Other") {
    return {
      title: {
        $not: /^[A-Za-z]+ \d{4}\b/,
      },
    };
  }

  return {
    title: {
      $regex: new RegExp(`^${escapeRegex(period)}(?:\\s|$)`, "i"),
    },
  };
}

function buildSubjectFilter(subject?: string | null) {
  if (!subject) {
    return {};
  }

  const sectionName = subject === "math" ? MATH_SECTION : VERBAL_SECTION;
  const sectionNames = getSectionQueryNames(sectionName);

  return {
    sections: {
      $elemMatch: {
        name: { $in: sectionNames },
        questionsCount: { $gt: 0 },
      },
    },
  };
}

function buildMongoFilter(filters: TestFilters) {
  return {
    ...buildPeriodFilter(filters.period),
    ...buildSubjectFilter(filters.subject),
  };
}

function getTestPeriodLabel(title: string) {
  const parts = title.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }

  return "Other";
}

function getPeriodSortValue(period: string) {
  if (period === "Other") {
    return -1;
  }

  const [monthLabel, yearLabel] = period.split(" ");
  const month = MONTH_INDEX[monthLabel?.toLowerCase?.() ?? ""] ?? 0;
  const year = Number.parseInt(yearLabel ?? "", 10);

  if (!Number.isFinite(year)) {
    return -1;
  }

  return year * 100 + month;
}

function sortPeriods(periods: string[]) {
  return [...periods].sort((left, right) => {
    const diff = getPeriodSortValue(right) - getPeriodSortValue(left);
    if (diff !== 0) {
      return diff;
    }

    return left.localeCompare(right);
  });
}

async function getAvailablePeriods(filters: TestFilters) {
  const metadataFilter = buildMongoFilter({
    ...filters,
    period: null,
  });
  const tests = await Test.find(metadataFilter).select("title").lean();
  const periods = Array.from(new Set(tests.map((test) => getTestPeriodLabel(test.title))));

  return ["All", ...sortPeriods(periods)];
}

function buildPeriodSortStages(sortOrder: "asc" | "desc"): PipelineStage[] {
  const sortDirection: 1 | -1 = sortOrder === "asc" ? 1 : -1;
  const monthBranches = Object.entries(MONTH_INDEX).map(([monthName, monthIndex]) => ({
    case: { $eq: [{ $toLower: { $arrayElemAt: [{ $split: ["$title", " "] }, 0] } }, monthName] },
    then: monthIndex,
  }));

  return [
    {
      $addFields: {
        __titleParts: { $split: ["$title", " "] },
      },
    },
    {
      $addFields: {
        __sortMonth: {
          $switch: {
            branches: monthBranches,
            default: 0,
          },
        },
        __sortYear: {
          $convert: {
            input: { $arrayElemAt: ["$__titleParts", 1] },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $addFields: {
        __periodSortValue: {
          $add: [{ $multiply: ["$__sortYear", 100] }, "$__sortMonth"],
        },
      },
    },
    {
      $sort: {
        __periodSortValue: sortDirection,
        title: 1 as const,
      },
    },
    {
      $project: {
        __titleParts: 0,
        __sortMonth: 0,
        __sortYear: 0,
        __periodSortValue: 0,
      },
    },
  ];
}

async function getPaginatedTests(
  filter: ReturnType<typeof buildMongoFilter>,
  page: number,
  limit: number,
  sortBy: SortableTestField,
  sortOrder: "asc" | "desc",
) {
  const usePagination = Number.isFinite(limit) && limit > 0;
  const skip = usePagination ? (page - 1) * limit : 0;

  if (sortBy === "createdAt") {
    const pipeline: PipelineStage[] = [
      { $match: filter },
      ...buildPeriodSortStages(sortOrder),
      ...(usePagination ? [{ $skip: skip }, { $limit: limit }] : []),
    ];

    return Test.aggregate(pipeline);
  }

  let query = Test.find(filter).sort({ title: sortOrder === "asc" ? 1 : -1 }).skip(skip);

  if (usePagination) {
    query = query.limit(limit);
  }

  return query.lean();
}

async function getQuestionCountsForTests(testIds: Types.ObjectId[]) {
  const questionCountsData = await Question.aggregate([
    { $match: { testId: { $in: testIds } } },
    {
      $group: {
        _id: { testId: "$testId", section: "$section", module: "$module" },
        count: { $sum: 1 },
      },
    },
  ]);

  return questionCountsData;
}

function attachQuestionCounts<T extends { _id: Types.ObjectId }>(
  tests: T[],
  questionCountsData: Array<{
    _id: { testId: Types.ObjectId; section: string; module: number };
    count: number;
  }>,
) {
  return tests.map((test) => {
    const counts = { rw_1: 0, rw_2: 0, math_1: 0, math_2: 0 };

    questionCountsData.forEach((questionCount) => {
      if (questionCount._id.testId.toString() === test._id.toString()) {
        const sectionPrefix = isVerbalSection(questionCount._id.section) ? "rw" : "math";
        const key = `${sectionPrefix}_${questionCount._id.module}` as keyof typeof counts;
        counts[key] = questionCount.count;
      }
    });

    return { ...test, questionCounts: counts };
  });
}

export const testService = {
  async getTests(page: number, limit: number, sortBy: string, sortOrder: string, filters: TestFilters = {}) {
    const normalizedSortBy: SortableTestField = sortBy === "title" ? "title" : "createdAt";
    const normalizedSortOrder: "asc" | "desc" = sortOrder === "asc" ? "asc" : "desc";
    const mongoFilter = buildMongoFilter(filters);

    await dbConnect();

    const usePagination = Number.isFinite(limit) && limit > 0;
    const [totalTests, tests, availablePeriods] = await Promise.all([
      Test.countDocuments(mongoFilter),
      getPaginatedTests(mongoFilter, page, limit, normalizedSortBy, normalizedSortOrder),
      getAvailablePeriods(filters),
    ]);

    const questionCountsData = await getQuestionCountsForTests(tests.map((test) => test._id as Types.ObjectId));
    const testsWithCounts = attachQuestionCounts(tests, questionCountsData);

    return {
      tests: testsWithCounts,
      availablePeriods,
      pagination: {
        total: totalTests,
        page,
        limit: usePagination ? limit : totalTests,
        totalPages: usePagination ? Math.ceil(totalTests / limit) : 1,
      },
    };
  },

  async getTestById(testId: string) {
    await dbConnect();

    const test = await Test.findById(testId).lean();
    if (!test) {
      throw new Error("Test not found");
    }

    const questionCountsData = await getQuestionCountsForTests([test._id as Types.ObjectId]);
    const [testWithCounts] = attachQuestionCounts([test], questionCountsData);

    return testWithCounts;
  },

  async createTest(data: unknown) {
    try {
      const validatedData: TestInput = TestValidationSchema.parse(data);

      if (!validatedData.timeLimit) {
        validatedData.timeLimit = validatedData.sections.reduce((acc, sec) => acc + sec.timeLimit, 0);
      }

      await dbConnect();
      return await Test.create(validatedData);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const validationError = new Error("Validation Error") as Error & {
          errors: z.ZodIssue[];
          name: string;
        };
        validationError.errors = error.issues;
        validationError.name = "ZodError";
        throw validationError;
      }

      throw error;
    }
  },
};
