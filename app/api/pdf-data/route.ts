import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Raw PDF data export has been disabled.",
      message: "Use the secure flattened PDF download endpoint instead.",
    },
    { status: 410 },
  );
}
