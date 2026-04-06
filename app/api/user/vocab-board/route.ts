import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { emptyVocabBoard, normalizeVocabBoard } from "@/lib/vocabBoard";

function getUserLookup(session: Session | null) {
  if (session?.user?.id) {
    return { _id: session.user.id };
  }

  if (session?.user?.email) {
    return { email: session.user.email };
  }

  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userLookup = getUserLookup(session);

    if (!userLookup) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne(userLookup).select("vocabBoard").lean<{ vocabBoard?: unknown } | null>();
    return NextResponse.json(
      {
        board: normalizeVocabBoard(user?.vocabBoard ?? emptyVocabBoard),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/user/vocab-board error:", error);
    return NextResponse.json({ error: "Failed to load vocab board" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userLookup = getUserLookup(session);

    if (!userLookup) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const board = normalizeVocabBoard(body?.board);

    await dbConnect();

    const updatedUser = await User.findOneAndUpdate(userLookup, { vocabBoard: board }, { new: true }).select("_id");

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vocab board saved", board }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/user/vocab-board error:", error);
    return NextResponse.json({ error: "Failed to save vocab board" }, { status: 500 });
  }
}
