import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { testService } from "@/lib/services/testService";

export const testController = {
  async getTests(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const page = Number.parseInt(searchParams.get("page") || "1", 10);
      const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
      const sortBy = searchParams.get("sortBy") || "createdAt";
      const sortOrder = searchParams.get("sortOrder") || "desc";
      const period = searchParams.get("period");
      const subject = searchParams.get("subject");

      const result = await testService.getTests(page, limit, sortBy, sortOrder, {
        period,
        subject,
      });

      return NextResponse.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },

  async createTest(req: Request) {
    try {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();

      try {
        const newTest = await testService.createTest(body);
        return NextResponse.json({ test: newTest }, { status: 201 });
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "ZodError" &&
          "errors" in error &&
          Array.isArray(error.errors)
        ) {
          const errorMessage = error.errors
            .map((issue) =>
              issue && typeof issue === "object" && "message" in issue ? String(issue.message) : "Invalid input",
            )
            .join(", ");
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        throw error;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
};
