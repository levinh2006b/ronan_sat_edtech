import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import Question from "@/lib/models/Question";
import Test from "@/lib/models/Test";
import { getSectionQueryNames, normalizeSectionName } from "@/lib/sections";

type PdfDataTest = {
  title: string;
};

function normalizeSection(rawSection: string | null): string | undefined {
  return normalizeSectionName(rawSection) || undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const testId = searchParams.get("testId");
    const sectionName = normalizeSection(searchParams.get("section"));

    if (!testId) {
      return NextResponse.json({ error: "Missing testId" }, { status: 400 });
    }

    await dbConnect();

    const sectionNames = getSectionQueryNames(sectionName);

    const [rawTest, rawQuestions] = await Promise.all([
      Test.findById(testId).select("title").lean<PdfDataTest | null>(),
      Question.find(sectionNames.length > 0 ? { testId, section: { $in: sectionNames } } : { testId }).lean(),
    ]);

    if (!rawTest?.title) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (!rawQuestions.length) {
      return NextResponse.json({ error: "No questions found for this test" }, { status: 404 });
    }

    return NextResponse.json(
      {
        testTitle: rawTest.title,
        questions: rawQuestions,
        sectionName,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch PDF data", error);
    return NextResponse.json({ error: "Failed to fetch PDF data" }, { status: 500 });
  }
}
