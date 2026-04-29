import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { PdfAssetError, getPdfDownload } from "@/lib/services/pdfAssetService";

export const runtime = "nodejs";

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
}

function parseModuleNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const testId = searchParams.get("testId")?.trim();
  const sectionName = searchParams.get("section")?.trim() || undefined;
  const moduleNumber = parseModuleNumber(searchParams.get("module"));
  const mode = sectionName ? "sectional" : "full";
  const token = request.headers.get("x-test-access-token")?.trim() || undefined;

  if (!testId) {
    return NextResponse.json({ error: "Missing test id." }, { status: 400 });
  }

  try {
    const download = await getPdfDownload({
      session,
      params: {
        testId,
        mode,
        sectionName,
        moduleNumber,
        token,
      },
      ipAddress: getIpAddress(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const headers = new Headers({
      "Content-Type": download.contentType,
      "Content-Disposition": `attachment; filename="${download.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (typeof download.contentLength === "number") {
      headers.set("Content-Length", String(download.contentLength));
    }

    return new NextResponse(download.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof PdfAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("GET /api/test-pdfs/download error:", error);
    return NextResponse.json({ error: "Failed to download this PDF." }, { status: 500 });
  }
}
