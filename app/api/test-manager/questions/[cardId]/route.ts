import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth/server";
import {
  getTestManagerQuestionErrorMessage,
  getTestManagerQuestionErrorStatus,
  testManagerQuestionService,
} from "@/lib/services/testManagerQuestionService";

type RouteContext = {
  params: Promise<{
    cardId: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await context.params;
    const data = await testManagerQuestionService.getEditorData(cardId, session);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET /api/test-manager/questions/[cardId] error:", error);
    return NextResponse.json({ error: getTestManagerQuestionErrorMessage(error) }, { status: getTestManagerQuestionErrorStatus(error) });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await context.params;
    const body = await req.json();
    const data = await testManagerQuestionService.updateQuestion(cardId, body, session);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/test-manager/questions/[cardId] error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid question payload.", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: getTestManagerQuestionErrorMessage(error) }, { status: getTestManagerQuestionErrorStatus(error) });
  }
}
