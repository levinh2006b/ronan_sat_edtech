import { MongoClient } from "mongodb";

import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { TEST_MANAGER_REPORT_REASONS } from "../../../lib/testManagerReports";

type MongoBoardDocument = {
  key?: string;
  board?: unknown;
};

type MongoBoardCard = {
  questionId?: string;
  reports?: MongoBoardReport[];
};

type MongoBoardReport = {
  reporterId?: string;
  errorType?: string;
  note?: string;
  source?: "test" | "review";
  createdAt?: string;
};

type MongoStudentDocument = {
  _id: { toString(): string };
  name?: string;
  school?: string;
  score?: number;
  examDate?: string;
  imageUrl?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toIsoString(value: Date | string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isReportReason(value: string | undefined): value is (typeof TEST_MANAGER_REPORT_REASONS)[number] {
  return typeof value === "string" && TEST_MANAGER_REPORT_REASONS.includes(value as (typeof TEST_MANAGER_REPORT_REASONS)[number]);
}

function isUuid(value: string | undefined) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function main() {
  const mongoUri = getRequiredEnv("MONGODB_URI");
  const mongoClient = new MongoClient(mongoUri);
  const supabase = createSupabaseAdminClient();

  await mongoClient.connect();

  try {
    const database = mongoClient.db();
    const legacyBoard = (await database.collection("fixboards").findOne({ key: "global" })) as MongoBoardDocument | null;
    const { data: questions, error: questionsError } = await supabase.from("questions").select("id,legacy_mongo_id");

    if (questionsError || !questions) {
      throw new Error(`Failed to load questions for report migration: ${questionsError?.message ?? "unknown error"}`);
    }

    const questionIdMap = new Map(
      questions.filter((question) => question.legacy_mongo_id).map((question) => [question.legacy_mongo_id!, question.id]),
    );

    if (legacyBoard?.board) {
      const rawCards =
        typeof legacyBoard.board === "object" && legacyBoard.board !== null && "cards" in legacyBoard.board
          ? (legacyBoard.board as { cards?: Record<string, MongoBoardCard> }).cards ?? {}
          : {};
      const reportRows = Object.values(rawCards).flatMap((card) => {
        const questionId = questionIdMap.get(card.questionId ?? "") ?? (isUuid(card.questionId) ? card.questionId : null);
        if (!questionId) {
          return [];
        }

        return (card.reports ?? []).map((report) => ({
          question_id: questionId,
          reporter_user_id: isUuid(report.reporterId) ? report.reporterId : null,
          report_reason: isReportReason(report.errorType) ? report.errorType : "Question",
          additional_context: report.note?.trim() || null,
          report_source: report.source === "review" ? "review" : "test",
          created_at: toIsoString(report.createdAt) ?? new Date().toISOString(),
        }));
      });

      if (reportRows.length > 0) {
        await supabase.from("user_reports").delete().not("id", "is", null);
        const { error: reportError } = await supabase.from("user_reports").insert(reportRows);

        if (reportError) {
          throw new Error(`Failed to migrate reported questions: ${reportError.message}`);
        }
      }
    }

    const students = (await database.collection("students").find({}).sort({ createdAt: 1, _id: 1 }).toArray()) as MongoStudentDocument[];
    await supabase.from("hall_of_fame_students").delete().not("id", "is", null);

    if (students.length > 0) {
      const { error: studentError } = await supabase.from("hall_of_fame_students").insert(
        students.map((student) => ({
          name: student.name?.trim() || "Unknown Student",
          school: student.school?.trim() || "Unknown School",
          score: typeof student.score === "number" ? student.score : 400,
          exam_date: student.examDate?.trim() || "Unknown Date",
          image_url: student.imageUrl?.trim() || "https://example.com/placeholder.jpg",
          created_at: toIsoString(student.createdAt),
          updated_at: toIsoString(student.updatedAt),
        })),
      );

      if (studentError) {
        throw new Error(`Failed to migrate hall-of-fame students: ${studentError.message}`);
      }
    }

    console.log(`Migrated legacy reported questions and ${students.length} hall-of-fame students.`);
  } finally {
    await mongoClient.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
