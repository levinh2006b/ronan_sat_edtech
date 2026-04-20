import type { AppSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TEST_MANAGER_REPORT_REASONS,
  type TestManagerCard,
  type TestManagerReportEntry,
  type TestManagerReportReason,
} from "@/lib/testManagerReports";

const PUBLIC_EXAM_EDIT_PERMISSION = "edit_public_exams";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UserReportRow = {
  id: string;
  question_id: string;
  reporter_user_id: string | null;
  report_reason: TestManagerReportReason;
  additional_context: string | null;
  report_source: "test" | "review";
  created_at: string;
  resolved_at: string | null;
};

type QuestionMetaRow = {
  id: string;
  position: number;
  test_sections:
    | {
        id: string;
        test_id: string;
        name: string;
        module_number: number | null;
        tests:
          | {
              id: string;
              title: string;
              visibility: "public" | "private";
              status: string;
            }
          | {
              id: string;
              title: string;
              visibility: "public" | "private";
              status: string;
            }[]
          | null;
      }
    | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

class TestManagerReportError extends Error {
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

  throw new TestManagerReportError(403, "You do not have permission to review reported questions.");
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function getNestedTest(testSection: QuestionMetaRow["test_sections"]) {
  if (!testSection || !testSection.tests) {
    return null;
  }

  return Array.isArray(testSection.tests) ? testSection.tests[0] ?? null : testSection.tests;
}

async function loadReports(questionId?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("user_reports")
    .select("id,question_id,reporter_user_id,report_reason,additional_context,report_source,created_at,resolved_at")
    .order("created_at", { ascending: false });

  if (questionId) {
    query = query.eq("question_id", questionId);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new TestManagerReportError(500, error?.message ?? "Failed to load reports.");
  }

  return data as UserReportRow[];
}

async function loadQuestionMeta(questionIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
        id,
        position,
        test_sections!inner (
          id,
          test_id,
          name,
          module_number,
          tests!inner (
            id,
            title,
            visibility,
            status
          )
        )
      `,
    )
    .in("id", questionIds);

  if (error || !data) {
    throw new TestManagerReportError(500, error?.message ?? "Failed to load reported question metadata.");
  }

  return data as unknown as QuestionMetaRow[];
}

async function loadReporterProfiles(reporterIds: string[]) {
  if (reporterIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("id,display_name,username").in("id", reporterIds);
  if (error || !data) {
    throw new TestManagerReportError(500, error?.message ?? "Failed to load reporter profiles.");
  }

  return new Map((data as ProfileRow[]).map((profile) => [profile.id, profile]));
}

function mapReportEntry(report: UserReportRow, reporters: Map<string, ProfileRow>): TestManagerReportEntry {
  const reporter = report.reporter_user_id ? reporters.get(report.reporter_user_id) : undefined;

  return {
    id: report.id,
    reporterId: report.reporter_user_id ?? undefined,
    reporterName: reporter?.display_name ?? reporter?.username ?? undefined,
    reason: TEST_MANAGER_REPORT_REASONS.includes(report.report_reason) ? report.report_reason : "Question",
    additionalContext: report.additional_context ?? undefined,
    source: report.report_source,
    createdAt: report.created_at,
    resolvedAt: report.resolved_at ?? undefined,
  };
}

function buildCard(question: QuestionMetaRow, reports: UserReportRow[], reporters: Map<string, ProfileRow>): TestManagerCard | null {
  const testSection = question.test_sections;
  const test = getNestedTest(testSection);
  const latestReport = reports[0];

  if (!testSection || !test || !latestReport) {
    return null;
  }

  return {
    id: question.id,
    questionId: question.id,
    text: test.title,
    createdAt: latestReport.created_at,
    testId: test.id,
    testTitle: test.title,
    section: testSection.name,
    module: testSection.module_number ?? 1,
    questionNumber: question.position,
    reportCount: reports.length,
    isResolved: reports.every((report) => Boolean(report.resolved_at)),
    reports: reports.map((report) => mapReportEntry(report, reporters)),
  };
}

export async function listReportedQuestions(session: AppSession) {
  requirePublicExamEditor(session);

  const reports = await loadReports();
  if (reports.length === 0) {
    return [] as TestManagerCard[];
  }

  const questionIds = Array.from(new Set(reports.map((report) => report.question_id)));
  const reporterIds = Array.from(new Set(reports.map((report) => report.reporter_user_id).filter((value): value is string => Boolean(value))));
  const [questions, reporters] = await Promise.all([loadQuestionMeta(questionIds), loadReporterProfiles(reporterIds)]);

  const reportsByQuestion = new Map<string, UserReportRow[]>();
  for (const report of reports) {
    const entries = reportsByQuestion.get(report.question_id) ?? [];
    entries.push(report);
    reportsByQuestion.set(report.question_id, entries);
  }

  return questions
    .map((question) => buildCard(question, reportsByQuestion.get(question.id) ?? [], reporters))
    .filter((card): card is TestManagerCard => Boolean(card))
    .sort((left, right) => {
      if (left.isResolved !== right.isResolved) {
        return left.isResolved ? 1 : -1;
      }

      if (left.createdAt === right.createdAt) {
        return right.reportCount - left.reportCount;
      }

      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
}

export async function getReportedQuestionCard(questionId: string, session: AppSession) {
  requirePublicExamEditor(session);

  const reports = await loadReports(questionId);
  if (reports.length === 0) {
    throw new TestManagerReportError(404, "Reported question not found.");
  }

  const [question] = await loadQuestionMeta([questionId]);
  if (!question) {
    throw new TestManagerReportError(404, "Reported question not found.");
  }

  const reporterIds = Array.from(new Set(reports.map((report) => report.reporter_user_id).filter((value): value is string => Boolean(value))));
  const reporters = await loadReporterProfiles(reporterIds);
  const card = buildCard(question, reports, reporters);

  if (!card) {
    throw new TestManagerReportError(404, "Reported question not found.");
  }

  return card;
}

export async function resolveReportedQuestionId(questionId: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase.from("questions").select("id,legacy_mongo_id");
  const { data, error } = await (isUuid(questionId) ? query.eq("id", questionId) : query.eq("legacy_mongo_id", questionId)).maybeSingle<{ id: string; legacy_mongo_id: string | null }>();

  if (error || !data) {
    throw new TestManagerReportError(404, "Question not found.");
  }

  return data.id;
}

export async function createUserReport(input: {
  questionId: string;
  reporterUserId: string;
  reason: TestManagerReportReason;
  additionalContext?: string;
  source: "test" | "review";
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("user_reports").insert({
    question_id: input.questionId,
    reporter_user_id: input.reporterUserId,
    report_reason: input.reason,
    additional_context: input.additionalContext ?? null,
    report_source: input.source,
  });

  if (!error) {
    return;
  }

  if (error.code === "23505") {
    throw new TestManagerReportError(409, "You have already reported this question.");
  }

  throw new TestManagerReportError(500, error.message);
}

export async function toggleReportedQuestionResolved(questionId: string, resolvedByUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: reports, error: loadError } = await supabase
    .from("user_reports")
    .select("id,resolved_at")
    .eq("question_id", questionId)
    .limit(1);

  if (loadError || !reports || reports.length === 0) {
    throw new TestManagerReportError(404, "Reported question not found.");
  }

  const shouldResolve = !reports[0].resolved_at;
  const { error } = await supabase
    .from("user_reports")
    .update(
      shouldResolve
        ? {
            resolved_at: new Date().toISOString(),
            resolved_by_user_id: resolvedByUserId,
          }
        : {
            resolved_at: null,
            resolved_by_user_id: null,
          },
    )
    .eq("question_id", questionId);

  if (error) {
    throw new TestManagerReportError(500, error.message);
  }

  return shouldResolve;
}

export async function deleteReportedQuestion(questionId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("user_reports").delete().eq("question_id", questionId);

  if (error) {
    throw new TestManagerReportError(500, error.message);
  }
}

export function getTestManagerReportErrorStatus(error: unknown) {
  return error instanceof TestManagerReportError ? error.status : 500;
}

export function getTestManagerReportErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load reported questions.";
}
