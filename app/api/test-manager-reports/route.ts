import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  emptyTestManagerBoard,
  normalizeTestManagerBoard,
  type TestManagerBoardState,
  type TestManagerCard,
  type TestManagerReportEntry,
} from "@/lib/testManagerBoard";
import dbConnect from "@/lib/mongodb";
import TestManagerBoard from "@/lib/models/TestManagerBoard";

const TEST_MANAGER_BOARD_KEY = "global";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TestManagerReportSchema = z.object({
  testId: z.string().min(1),
  questionId: z.string().min(1),
  section: z.string().min(1),
  module: z.number().int().positive(),
  questionNumber: z.number().int().positive(),
  errorType: z.enum(["Question", "Answers", "Missing Graph/Image"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  source: z.enum(["test", "review"]).default("test"),
});

async function getTestManagerBoardDocument() {
  return TestManagerBoard.findOneAndUpdate(
    { key: TEST_MANAGER_BOARD_KEY },
    { $setOnInsert: { board: emptyTestManagerBoard } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

function createUniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveLegacyTestAndQuestionIds(testId: string, questionId: string) {
  const supabase = createSupabaseAdminClient();
  const testQuery = supabase.from("tests").select("id,title,legacy_mongo_id");
  const questionQuery = supabase.from("questions").select("id,legacy_mongo_id");
  const [{ data: test }, { data: question }] = await Promise.all([
    (isUuid(testId) ? testQuery.eq("id", testId) : testQuery.eq("legacy_mongo_id", testId)).maybeSingle(),
    (isUuid(questionId) ? questionQuery.eq("id", questionId) : questionQuery.eq("legacy_mongo_id", questionId)).maybeSingle(),
  ]);

  return {
    testId: test?.legacy_mongo_id ?? testId,
    questionId: question?.legacy_mongo_id ?? questionId,
    testTitle: test?.title ?? "Unknown Test",
  };
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function buildCardTitle(card: Pick<TestManagerCard, "section" | "module" | "questionNumber" | "testTitle">) {
  return card.testTitle;
}

function appendReportToBoard(
  board: TestManagerBoardState,
  payload: z.infer<typeof TestManagerReportSchema>,
  report: TestManagerReportEntry,
  testTitle: string,
) {
  const existingCard = Object.values(board.cards).find(
    (card) => card.testId === payload.testId && card.questionId === payload.questionId,
  );

  if (existingCard) {
    const alreadyReportedByUser = existingCard.reports.some((item) => item.reporterId && item.reporterId === report.reporterId);
    if (alreadyReportedByUser) {
      return {
        board,
        duplicate: true,
      };
    }

    const nextCard: TestManagerCard = {
      ...existingCard,
      testTitle: testTitle || existingCard.testTitle,
      reportCount: existingCard.reportCount + 1,
      reports: [report, ...existingCard.reports],
      text: buildCardTitle({
        ...existingCard,
        testTitle: testTitle || existingCard.testTitle,
      }),
    };

    return {
      board: {
        ...board,
        cards: {
          ...board.cards,
          [existingCard.id]: nextCard,
        },
      },
      duplicate: false,
    };
  }

  const cardId = createUniqueId("test-manager");
  const nextCard: TestManagerCard = {
    id: cardId,
    createdAt: report.createdAt,
    testId: payload.testId,
    questionId: payload.questionId,
    testTitle,
    section: payload.section,
    module: payload.module,
    questionNumber: payload.questionNumber,
    reportCount: 1,
    reports: [report],
    text: "",
  };

  nextCard.text = buildCardTitle(nextCard);

  return {
    board: {
      ...board,
      inboxIds: [...board.inboxIds, cardId],
      cards: {
        ...board.cards,
        [cardId]: nextCard,
      },
    },
    duplicate: false,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload = TestManagerReportSchema.parse(body);
    const resolvedIds = await resolveLegacyTestAndQuestionIds(payload.testId, payload.questionId);
    const normalizedPayload = {
      ...payload,
      testId: resolvedIds.testId,
      questionId: resolvedIds.questionId,
    };

    await dbConnect();

    const document = await getTestManagerBoardDocument();

    const board = normalizeTestManagerBoard(document.board);
    const report: TestManagerReportEntry = {
      id: createUniqueId("report"),
      reporterId: session.user.id,
      reporterName: session.user.name ?? undefined,
      reporterEmail: session.user.email ?? undefined,
      errorType: payload.errorType,
      note: payload.note?.trim() || undefined,
      source: payload.source,
      createdAt: new Date().toISOString(),
    };

    const { board: nextBoard, duplicate } = appendReportToBoard(board, normalizedPayload, report, resolvedIds.testTitle);
    if (duplicate) {
      return NextResponse.json({ error: "You have already reported this question." }, { status: 409 });
    }

    document.board = nextBoard;
    await document.save();

    return NextResponse.json({ message: "Report submitted", board: nextBoard }, { status: 201 });
  } catch (error) {
    console.error("POST /api/test-manager-reports error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid report payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
