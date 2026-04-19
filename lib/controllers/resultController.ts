import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/authOptions";
import { resultService } from "@/lib/services/resultService";

function mapCreateResultError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid result payload", details: error.flatten() },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Failed to create result";

  if (message === "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (message.includes("not found")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (message.includes("Invalid") || message.includes("mismatch")) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

export const resultController = {
  async createResult(req: Request) {
    try {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const newResult = await resultService.createResult(session.user.id, body);

      return NextResponse.json({ result: newResult }, { status: 201 });
    } catch (error) {
      console.error("Error creating result:", error);
      return mapCreateResultError(error);
    }
  },

  async getUserResults(req: Request) {
    try {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const daysQuery = url.searchParams.get("days");
      const days = daysQuery ? parseInt(daysQuery, 10) : undefined;

      const data = await resultService.getUserResults(session.user.id, days);
      return NextResponse.json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch results";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },

  async getUserErrorLog(req: Request) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const testType = url.searchParams.get("testType") === "sectional" ? "sectional" : "full";
      const statusParam = url.searchParams.get("status");
      const status = statusParam === "wrong" || statusParam === "omitted" ? statusParam : "all";
      const query = url.searchParams.get("query") ?? "";
      const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
      const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);

      const data = await resultService.getUserErrorLogPage(session.user.id, {
        testType,
        status,
        query,
        offset: Number.isNaN(offset) ? 0 : offset,
        limit: Number.isNaN(limit) ? 20 : limit,
      });

      return NextResponse.json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch error log";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },

  async updateAnswerReason(req: Request) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = (await req.json()) as {
        resultId?: unknown;
        questionId?: unknown;
        reason?: unknown;
      };

      const resultId = typeof body.resultId === "string" ? body.resultId.trim() : "";
      const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;

      if (!resultId || !questionId) {
        return NextResponse.json({ error: "resultId and questionId are required" }, { status: 400 });
      }

      if (reason && reason.length > 60) {
        return NextResponse.json({ error: "Reason must be 60 characters or fewer" }, { status: 400 });
      }

      const data = await resultService.updateAnswerReason(session.user.id, resultId, questionId, reason);
      return NextResponse.json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update answer reason";
      const status = message === "Result answer not found" ? 404 : message.includes("Invalid") ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
};
