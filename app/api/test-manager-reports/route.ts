import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { z } from "zod";

import {
  createUserReport,
  getTestManagerReportErrorMessage,
  getTestManagerReportErrorStatus,
  listReportedQuestions,
  resolveReportedQuestionId,
} from "@/lib/services/testManagerReportService";
import { TEST_MANAGER_REPORT_REASONS } from "@/lib/testManagerReports";

const TestManagerReportSchema = z.object({
  testId: z.string().min(1).optional(),
  questionId: z.string().min(1),
  section: z.string().min(1).optional(),
  module: z.number().int().positive().optional(),
  questionNumber: z.number().int().positive().optional(),
  reason: z.enum(TEST_MANAGER_REPORT_REASONS),
  additionalContext: z.string().trim().max(500).optional().or(z.literal("")),
  source: z.enum(["test", "review"]).default("test"),
});

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cards = await listReportedQuestions(session);
    return NextResponse.json({ cards }, { status: 200 });
  } catch (error) {
    console.error("GET /api/test-manager-reports error:", error);
    return NextResponse.json({ error: getTestManagerReportErrorMessage(error) }, { status: getTestManagerReportErrorStatus(error) });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload = TestManagerReportSchema.parse(body);
    const questionId = await resolveReportedQuestionId(payload.questionId);

    await createUserReport({
      questionId,
      reporterUserId: session.user.id,
      reason: payload.reason,
      additionalContext: payload.additionalContext?.trim() || undefined,
      source: payload.source,
    });

    return NextResponse.json({ message: "Report submitted", questionId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/test-manager-reports error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid report payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: getTestManagerReportErrorMessage(error) }, { status: getTestManagerReportErrorStatus(error) });
  }
}
