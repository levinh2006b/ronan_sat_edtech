import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import {
  deleteReportedQuestion,
  getTestManagerReportErrorMessage,
  getTestManagerReportErrorStatus,
  resolveReportedQuestionId,
  toggleReportedQuestionResolved,
} from "@/lib/services/testManagerReportService";

export async function PATCH(_: Request, context: { params: Promise<{ questionId: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.permissions.includes("edit_public_exams")) {
      return NextResponse.json({ error: "You do not have permission to review reported questions." }, { status: 403 });
    }

    const { questionId: rawQuestionId } = await context.params;
    const questionId = await resolveReportedQuestionId(rawQuestionId);
    const isResolved = await toggleReportedQuestionResolved(questionId, session.user.id);

    return NextResponse.json({ message: isResolved ? "Reported question resolved." : "Reported question reopened.", questionId, isResolved }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/test-manager-reports/[questionId] error:", error);
    return NextResponse.json({ error: getTestManagerReportErrorMessage(error) }, { status: getTestManagerReportErrorStatus(error) });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ questionId: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.permissions.includes("edit_public_exams")) {
      return NextResponse.json({ error: "You do not have permission to delete reported questions." }, { status: 403 });
    }

    const { questionId: rawQuestionId } = await context.params;
    const questionId = await resolveReportedQuestionId(rawQuestionId);
    await deleteReportedQuestion(questionId);

    return NextResponse.json({ message: "Reported question deleted.", questionId }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/test-manager-reports/[questionId] error:", error);
    return NextResponse.json({ error: getTestManagerReportErrorMessage(error) }, { status: getTestManagerReportErrorStatus(error) });
  }
}
