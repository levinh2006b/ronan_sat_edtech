// Connect FE with database about data regarding tests
// Function: Get test list, Specific detail about a test, and Create a new test

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MATH_SECTION, VERBAL_SECTION, isVerbalSection } from "@/lib/sections";
import { TestValidationSchema, type TestInput } from "@/lib/schema/test";

type SortableTestField = "createdAt" | "title";  // 2 way to sort
type TestFilters = {                             // Filter: Only show test accoding to subject (Math/Verbal) or period (March 2025)
  period?: string | null;
  subject?: string | null;
};

type RawTestRow = {      // Info for a specific test
  id: string;
  title: string;
  difficulty: string | null;
  time_limit_minutes: number;
  created_at: string;
  test_sections: Array<{            // Array containing each section (verbal/math) of the test
    id: string;
    name: string;
    module_number: number | null;
    question_count: number;
    time_limit_minutes: number;
    display_order: number;
  }> | null;
};

const MONTH_INDEX: Record<string, number> = {    // Index each month for sorting
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

function getTestPeriodLabel(title: string) {     // Only get 2 word in the name of the test
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

  // SỬA Ở ĐÂY: Đổi vị trí yearLabel lên trước, monthLabel ra sau
  const [yearLabel, monthLabel] = period.split(" "); 
  
  // Phần dưới giữ nguyên, hệ thống sẽ tự hiểu đúng: 
  // monthLabel = "AUGUST" -> month = 8
  // yearLabel = "2025" -> year = 2025
  const month = MONTH_INDEX[monthLabel?.toLowerCase?.() ?? ""] ?? 0;
  const year = Number.parseInt(yearLabel ?? "", 10);

  if (!Number.isFinite(year)) {
    return -1;
  }

  return year * 100 + month; // 2025 * 100 + 8 = 202508 (Sắp xếp cực mượt!)
}


// sort
function sortPeriods(periods: string[]) {
  return [...periods].sort((left, right) => {       // Create a copy of the original list  -> .sort() algo of JS automatically sort every element in an array => left and right aren't only comparing 2 value
    const diff = getPeriodSortValue(right) - getPeriodSortValue(left);    // Substitute the value 
    if (diff !== 0) {
      return diff;         // sort according to the result
    }

    return left.localeCompare(right);   // if the value of the name is equal, compare according to the alphabet
  });
}


// Filter test according to the name to display or not
function matchesPeriod(title: string, period?: string | null) {
  if (!period || period === "All") {
    return true;
  }

  if (period === "Other") {
    // SỬA Ở ĐÂY: Đổi Regex thành \d{4} (4 chữ số) lên trước, [A-Za-z]+ (Chữ) ra sau
    // Nó sẽ kiểm tra xem chuỗi có dạng "Số + Chữ" hay không (Ví dụ: "2025 August")
    return !/^\d{4} [A-Za-z]+\b/.test(title);
  }

  return title.toLowerCase().startsWith(period.toLowerCase());
}
function matchesSubject(sections: RawTestRow["test_sections"], subject?: string | null) {
  if (!subject) {
    return true;
  }

  const target = subject === "math" ? MATH_SECTION : VERBAL_SECTION;
  return (sections ?? []).some((section) => {
    if (section.question_count <= 0) {
      return false;
    }

    return target === MATH_SECTION ? section.name === MATH_SECTION : isVerbalSection(section.name);
  });
}

function toLegacyTestShape(test: RawTestRow) {
  const sections = [...(test.test_sections ?? [])]
    .sort((left, right) => left.display_order - right.display_order)
    .map((section) => ({
      name: section.name,
      questionsCount: section.question_count,
      timeLimit: section.time_limit_minutes,
    }));

  const questionCounts = { rw_1: 0, rw_2: 0, math_1: 0, math_2: 0 };
  for (const section of test.test_sections ?? []) {
    const moduleNumber = section.module_number ?? 0;
    if (moduleNumber !== 1 && moduleNumber !== 2) {
      continue;
    }

    const key = `${isVerbalSection(section.name) ? "rw" : "math"}_${moduleNumber}` as keyof typeof questionCounts;
    questionCounts[key] = section.question_count;
  }

  return {
    _id: test.id,
    title: test.title,
    timeLimit: test.time_limit_minutes,
    difficulty: test.difficulty ?? "medium",
    sections,
    questionCounts,
    createdAt: test.created_at,
  };
}

export const testService = {
  async getTests(page: number, limit: number, sortBy: string, sortOrder: string, filters: TestFilters = {}) {
    const supabase = createSupabaseAdminClient();
    const normalizedSortBy: SortableTestField = sortBy === "title" ? "title" : "createdAt";
    const normalizedSortOrder: "asc" | "desc" = sortOrder === "asc" ? "asc" : "desc";

    const { data, error } = await supabase
      .from("tests")
      .select(
        `
          id,
          title,
          difficulty,
          time_limit_minutes,
          created_at,
          test_sections (
            id,
            name,
            module_number,
            question_count,
            time_limit_minutes,
            display_order
          )
        `
      )
      .eq("visibility", "public")
      .eq("status", "published");

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as RawTestRow[];
    const filtered = rows.filter((test) => matchesPeriod(test.title, filters.period) && matchesSubject(test.test_sections, filters.subject));
    const availablePeriods = ["All", ...sortPeriods(Array.from(new Set(rows.map((test) => getTestPeriodLabel(test.title)))))];

    filtered.sort((left, right) => {
      // 1. Nếu người dùng muốn sắp xếp theo Tên bài thi (A-Z hoặc Z-A)
      if (normalizedSortBy === "title") {
        return normalizedSortOrder === "asc"  
          ? left.title.localeCompare(right.title)     // So trái với phải để tăng
          : right.title.localeCompare(left.title);    // So phải với trái để giảm
      }

      // 2. Nếu người dùng muốn sắp xếp theo Ngày tạo (createdAt) - CÁCH NÀY CHUẨN NHẤT
      // Đổi chuỗi ngày tháng ISO sang số (Timestamp) để trừ cho nhau
      const timeLeft = new Date(left.created_at).getTime();
      const timeRight = new Date(right.created_at).getTime();

      // Nếu "asc" (Tăng dần): Cũ nhất lên đầu (Left - Right)
      // Nếu "desc" (Giảm dần): Mới nhất lên đầu (Right - Left)
      return normalizedSortOrder === "asc" 
        ? timeLeft - timeRight     
        : timeRight - timeLeft;    
    });

    const usePagination = Number.isFinite(limit) && limit > 0;
    const paged = usePagination ? filtered.slice((page - 1) * limit, (page - 1) * limit + limit) : filtered;

    return {
      tests: paged.map(toLegacyTestShape),
      availablePeriods,
      pagination: {
        total: filtered.length,
        page,
        limit: usePagination ? limit : filtered.length,
        totalPages: usePagination ? Math.max(1, Math.ceil(filtered.length / limit)) : 1,
      },
    };
  },

  async getTestById(testId: string) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("tests")
      .select(
        `
          id,
          title,
          difficulty,
          time_limit_minutes,
          created_at,
          test_sections (
            id,
            name,
            module_number,
            question_count,
            time_limit_minutes,
            display_order
          )
        `
      )
      .eq("id", testId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Test not found");
    }

    return toLegacyTestShape(data as RawTestRow);
  },

  async createTest(data: unknown) {
    try {
      const validatedData: TestInput = TestValidationSchema.parse(data);
      if (!validatedData.timeLimit) {
        validatedData.timeLimit = validatedData.sections.reduce((acc, sec) => acc + sec.timeLimit, 0);
      }

      const supabase = createSupabaseAdminClient();
      const { data: createdTest, error: testError } = await supabase
        .from("tests")
        .insert({
          title: validatedData.title,
          time_limit_minutes: validatedData.timeLimit,
          difficulty: validatedData.difficulty ?? "medium",
          visibility: "public",
          status: "published",
        })
        .select("id")
        .single();

      if (testError || !createdTest) {
        throw new Error(testError?.message ?? "Failed to create test");
      }

      const sectionRows = validatedData.sections.map((section, index) => ({
        test_id: createdTest.id,
        name: section.name,
        module_number: null,
        display_order: index + 1,
        question_count: section.questionsCount,
        time_limit_minutes: section.timeLimit,
      }));

      const { error: sectionError } = await supabase.from("test_sections").insert(sectionRows);
      if (sectionError) {
        throw new Error(sectionError.message);
      }

      return this.getTestById(createdTest.id);
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
