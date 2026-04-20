import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";

import { emptyTestManagerBoard, normalizeTestManagerBoard } from "@/lib/testManagerBoard";
import dbConnect from "@/lib/mongodb";
import TestManagerBoard from "@/lib/models/TestManagerBoard";

const TEST_MANAGER_BOARD_KEY = "global";

async function getTestManagerBoardDocument() {
  return TestManagerBoard.findOneAndUpdate(
    { key: TEST_MANAGER_BOARD_KEY },
    { $setOnInsert: { board: emptyTestManagerBoard } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

function canAccessTestManager(permissions: string[] | undefined) {
  return permissions?.includes("edit_public_exams") ?? false;
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !canAccessTestManager(session.user.permissions)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const document = await getTestManagerBoardDocument();

    return NextResponse.json({ board: normalizeTestManagerBoard(document.board) }, { status: 200 });
  } catch (error) {
    console.error("GET /api/test-manager-board error:", error);
    return NextResponse.json({ error: "Failed to load test manager board" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !canAccessTestManager(session.user.permissions)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const board = normalizeTestManagerBoard(body?.board);

    await dbConnect();
    await TestManagerBoard.findOneAndUpdate(
      { key: TEST_MANAGER_BOARD_KEY },
      { board },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({ message: "Test manager board saved", board }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/test-manager-board error:", error);
    return NextResponse.json({ error: "Failed to save test manager board" }, { status: 500 });
  }
}
