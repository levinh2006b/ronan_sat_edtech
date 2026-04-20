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
  return (sections ?? []).some((section) => {       // some -> Cần có ít nhất 1 section để có thể được hiện ra
    if (section.question_count <= 0) {        // nếu section này k có câu hỏi nào thì k hiện
      return false;     
    }

    return target === MATH_SECTION ? section.name === MATH_SECTION : isVerbalSection(section.name);   // check user có đang tìm toán k -> Đúng thì check section của bài test này có phải toán k -> Sai (tức user đang tìm verbal) thì check bài test hiện tại có phải verbal k, cần hàm riêng vì tên có thể là Verbal hoặc Reading and Writing
  });
}


function toLegacyTestShape(test: RawTestRow) { 
  const sections = [...(test.test_sections ?? [])]              // Sao chép các dữ liệu của bài test đó
    .sort((left, right) => left.display_order - right.display_order)       // sort từ nhỏ tới lớn
    .map((section) => ({                         // database thích tên dữ liệu kiểu question_count nhưng FE thích kiểu questionsCount => đi qua từng section, copy thông tin từ vd question_count vào questionsCount
      name: section.name,
      questionsCount: section.question_count,
      timeLimit: section.time_limit_minutes,
    }));
 
  const questionCounts = { rw_1: 0, rw_2: 0, math_1: 0, math_2: 0 };   // Chuẩn bị sẵn 1 object đến số câu từng section
  for (const section of test.test_sections ?? []) { 
    const moduleNumber = section.module_number ?? 0;    // bài test này là module mấy 
    if (moduleNumber !== 1 && moduleNumber !== 2) {     // Phần thi k phải module 1 hoặc module 2 => Lỗi => K đếm
      continue;
    }

    // key k phải là giá trị unique của từng ký tự giống map
    const key = `${isVerbalSection(section.name) ? "rw" : "math"}_${moduleNumber}` as keyof typeof questionCounts;  // Đảm bảo với TS là key vừa nối ra thuộc dạng của questionCounts 
    questionCounts[key] = section.question_count;    //gấn vào số câu từng section
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
      // Bước 1: Tính toán giá trị số đại diện cho Thời gian (Period) của từng bài
      // Ví dụ: "2025 March" -> 202503, "2025 August" -> 202508
      const periodLeft = getPeriodSortValue(getTestPeriodLabel(left.title));
      const periodRight = getPeriodSortValue(getTestPeriodLabel(right.title));

      // TRƯỜNG HỢP 1: Nếu người dùng chọn sort theo "Title" (A-Z hoặc Z-A)
      if (normalizedSortBy === "title") {
        return normalizedSortOrder === "asc"  
          ? left.title.localeCompare(right.title)
          : right.title.localeCompare(left.title);
      }

      // TRƯỜNG HỢP 2: Nếu người dùng chọn "Oldest first" hoặc "Newest first" (mặc định)
      // Chúng ta ưu tiên so sánh theo Thời gian (Period) trước
      if (periodLeft !== periodRight) {
        return normalizedSortOrder === "asc" 
          ? periodLeft - periodRight   // Oldest first: 202401 -> 202512
          : periodRight - periodLeft;  // Newest first: 202512 -> 202401
      }

      // TRƯỜNG HỢP 3: Nếu 2 bài cùng một Period (ví dụ cùng tháng 8/2025)
      // Luôn luôn sắp xếp theo Tên A-Z như bạn yêu cầu (A -> B -> C -> D)
      return left.title.localeCompare(right.title);
    });
    

    const usePagination = Number.isFinite(limit) && limit > 0;    // đây là biến bool, kiểm tra limit (số test 1 trang) có phải số và không vô hạn và phải >0 => True
    const paged = usePagination ? filtered.slice((page - 1) * limit, (page - 1) * limit + limit) : filtered;
    // filter là các bài test được lọc, nếu usePagination là false => Hiện all
    // nếu usePagination true => slice để cắt 1 đoạn thuộc trang hiện tại

    return {
      tests: paged.map(toLegacyTestShape),       // Hiện các bài thi được filter, ép test có tên theo hàm toLegacyTestShape đặt
      availablePeriods,                          // Array chứa tên gồm 2 từ đầu của tất cả bài test
      pagination: {
        total: filtered.length,                  // tổng test theo yêu cầu filter
        page,
        limit: usePagination ? limit : filtered.length,     
        totalPages: usePagination ? Math.max(1, Math.ceil(filtered.length / limit)) : 1,   // tổng số trang
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
      .maybeSingle();       // Trả về 1 kết quả only, k thấy thì trả về null thay vì crash

    if (error || !data) {
      throw new Error("Test not found");
    }

    return toLegacyTestShape(data as RawTestRow);   // as RawTestRow để đảm bảo TS không báo lỗi 
  },

  async createTest(data: unknown) {
    try {
      // TestValidationSchema để check data mà admin điền cho bài test  có đúng format yêu cầu không
      // validatedData: TestInput -> khi gõ validatedData. là hiện ra các thành phần của 1 data TestInput cần có => Viết code nhanh hơn 
      const validatedData: TestInput = TestValidationSchema.parse(data);    
      if (!validatedData.timeLimit) {             // admin chưa điền tgian test thì tự động điền hộ
        validatedData.timeLimit = validatedData.sections.reduce((acc, sec) => acc + sec.timeLimit, 0);
      } 

      const supabase = createSupabaseAdminClient();   // kết nối với supabase
      const { data: createdTest, error: testError } = await supabase
        .from("tests")
        .insert({                        // insert thông tin bài test vào supabase
          title: validatedData.title,
          time_limit_minutes: validatedData.timeLimit,
          difficulty: validatedData.difficulty ?? "medium",
          visibility: "public",
          status: "published",
        })
        .select("id")    // lấy về id của bài test vừa tạo xong, đảm bảo chỉ có 1 kết quả -> Trả về là object thay vì array
        .single();

      if (testError || !createdTest) {
        throw new Error(testError?.message ?? "Failed to create test");
      }

      // Gán giá trị cho từng section của test được tạo
      const sectionRows = validatedData.sections.map((section, index) => ({
        test_id: createdTest.id,        // gán id của bài test vừa tạo vào test_id của từng section
        name: section.name,
        module_number: null,
        display_order: index + 1,    // Thứ tự hiện trong 1 bài test + 1
        question_count: section.questionsCount,
        time_limit_minutes: section.timeLimit,
      }));

      const { error: sectionError } = await supabase.from("test_sections").insert(sectionRows);   // lưu data của sectionsRows vào test_sections
      if (sectionError) {
        throw new Error(sectionError.message);
      }

      // Lấy data của bài test mà ta vừa insert (tạo) ở supabase để lấy ra (đã format các biến cho hợp FE) để hiện thông báo cho admin
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
