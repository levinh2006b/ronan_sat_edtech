import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { isDefaultReviewReasonCatalog, normalizeReviewReasonCatalog } from "@/lib/reviewReasonCatalog";

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
    const user = await User.findOne(userLookup).select("reviewReasonCatalog").lean<{ reviewReasonCatalog?: unknown } | null>();

    return NextResponse.json({ reasons: normalizeReviewReasonCatalog(user?.reviewReasonCatalog) }, { status: 200 });
  } catch (error) {
    console.error("GET /api/user/review-reasons error:", error);
    return NextResponse.json({ error: "Failed to load review reasons" }, { status: 500 });
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
    const reasons = normalizeReviewReasonCatalog(body?.reasons);
    const update = isDefaultReviewReasonCatalog(reasons)
      ? { $unset: { reviewReasonCatalog: 1 } }
      : { $set: { reviewReasonCatalog: reasons } };

    await dbConnect();
    const result = await User.updateOne(userLookup, update);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Review reasons saved", reasons }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/user/review-reasons error:", error);
    return NextResponse.json({ error: "Failed to save review reasons" }, { status: 500 });
  }
}
