import { Readable } from "stream";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import os from "os";
import path from "path";

import type { AppSession } from "@/lib/auth/session";
import { getGoogleDriveClient } from "@/lib/googleDrive/client";
import { normalizeSectionName } from "@/lib/sections";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PdfMode = "full" | "sectional";

type PdfDownloadParams = {
  testId: string;
  mode: PdfMode;
  sectionName?: string;
  moduleNumber?: number;
  token?: string;
};

type TestPdfAssetRow = {
  id: string;
  test_id: string;
  section_name: string | null;
  module_number: number | null;
  mode: PdfMode;
  asset_kind: string;
  object_key: string;
  file_name: string;
  content_type: string;
  file_size_bytes: number | null;
  version: number;
  storage_provider: "google_drive" | string;
  drive_file_id: string | null;
  drive_folder_id: string | null;
};

type PdfStreamSource = {
  asset: TestPdfAssetRow;
  body: unknown;
  contentType?: string | null;
  contentLength?: string | number | null;
};

type TestAccessRow = {
  id: string;
  title: string;
  visibility: string | null;
  status: string | null;
  owner_user_id: string | null;
};

type GroupAssignmentRow = {
  group_memberships?: Array<{ student_user_id?: string | null }> | { student_user_id?: string | null } | null;
};

export class PdfAssetError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PdfAssetError";
    this.status = status;
  }
}

function normalizeToken(token: string | undefined) {
  return token?.trim() ?? "";
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\r\n"]/g, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim();
  return cleaned || "ronan-sat-practice.pdf";
}

function parseSectionName(sectionName?: string) {
  const normalized = normalizeSectionName(sectionName);
  return normalized || undefined;
}

function getPdfDownloadFileName(test: TestAccessRow, asset: TestPdfAssetRow) {
  if (asset.mode === "sectional" && asset.section_name) {
    return sanitizeFileName(`Ronan SAT - ${test.title} - ${asset.section_name}.pdf`);
  }

  return sanitizeFileName(`Ronan SAT - ${test.title}.pdf`);
}

function isNodeReadableStream(value: unknown): value is Readable {
  return Boolean(value && typeof value === "object" && "pipe" in value);
}

function bodyToWebStream(body: unknown) {
  if (!body) {
    throw new PdfAssetError("The PDF file is empty.", 502);
  }

  if (body instanceof ReadableStream) {
    return body;
  }

  if (typeof body === "object" && body !== null && "transformToWebStream" in body) {
    return (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
  }

  if (isNodeReadableStream(body)) {
    return Readable.toWeb(body) as ReadableStream;
  }

  throw new PdfAssetError("Unable to stream the PDF file.", 502);
}

function getLocalPdfAssetRoots() {
  const configuredRoots = process.env.PDF_LOCAL_ASSET_ROOTS
    ?.split(path.delimiter)
    .map((root) => root.trim())
    .filter(Boolean);
  const roots = configuredRoots?.length
    ? configuredRoots
    : [
        process.env.PDF_OUTPUT_DIR,
        "D:\\image-only-pdfs",
        path.join(os.homedir(), "Desktop", "image-only-pdfs"),
      ];

  return [...new Set(roots.filter((root): root is string => Boolean(root)).map((root) => path.resolve(root)))];
}

function getLocalAssetPath(root: string, objectKey: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...objectKey.split("/"));

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

async function getLocalPdfStreamSourceForAsset(asset: TestPdfAssetRow): Promise<PdfStreamSource | null> {
  for (const root of getLocalPdfAssetRoots()) {
    const assetPath = getLocalAssetPath(root, asset.object_key);
    if (!assetPath || !existsSync(assetPath)) {
      continue;
    }

    const fileStats = await stat(assetPath);
    if (!fileStats.isFile()) {
      continue;
    }

    return {
      asset,
      body: createReadStream(assetPath),
      contentType: asset.content_type || "application/pdf",
      contentLength: fileStats.size,
    };
  }

  return null;
}

async function userCanReadTest(session: AppSession, test: TestAccessRow) {
  if (session.user.role === "ADMIN") {
    return true;
  }

  if (test.visibility === "public" && test.status === "published") {
    return true;
  }

  if (test.owner_user_id === session.user.id) {
    return true;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("test_group_assignments")
    .select("group_memberships(student_user_id)")
    .eq("test_id", test.id);

  if (error) {
    throw new PdfAssetError(error.message, 500);
  }

  return ((data ?? []) as GroupAssignmentRow[]).some((assignment) => {
    const memberships = assignment.group_memberships;
    const rows = Array.isArray(memberships) ? memberships : memberships ? [memberships] : [];
    return rows.some((membership) => membership.student_user_id === session.user.id);
  });
}

async function assertTokenAccess(session: AppSession, testId: string, token?: string) {
  if (session.user.role === "ADMIN") {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("locked_tests").select("token").eq("test_id", testId).maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return;
    }

    throw new PdfAssetError(error.message, 500);
  }

  if (!data) {
    return;
  }

  if (normalizeToken((data as { token?: string }).token) !== normalizeToken(token)) {
    throw new PdfAssetError("A valid token is required to download this PDF.", 423);
  }
}

async function getTest(session: AppSession, testId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tests")
    .select("id, title, visibility, status, owner_user_id")
    .eq("id", testId)
    .maybeSingle();

  if (error) {
    throw new PdfAssetError(error.message, 500);
  }

  if (!data) {
    throw new PdfAssetError("Test not found.", 404);
  }

  const test = data as TestAccessRow;
  const canRead = await userCanReadTest(session, test);
  if (!canRead) {
    throw new PdfAssetError("You do not have permission to download this PDF.", 403);
  }

  return test;
}

async function getActivePdfAsset(params: PdfDownloadParams) {
  const supabase = createSupabaseAdminClient();
  const sectionName = parseSectionName(params.sectionName);
  let query = supabase
    .from("test_pdf_assets")
    .select("id, test_id, section_name, module_number, mode, asset_kind, object_key, file_name, content_type, file_size_bytes, version, storage_provider, drive_file_id, drive_folder_id")
    .eq("test_id", params.testId)
    .eq("mode", params.mode)
    .eq("asset_kind", "flattened_pdf")
    .eq("storage_provider", "google_drive")
    .eq("is_active", true)
    .not("drive_file_id", "is", null)
    .order("version", { ascending: false })
    .limit(1);

  if (params.mode === "full") {
    query = query.is("section_name", null).is("module_number", null);
  } else {
    if (!sectionName) {
      throw new PdfAssetError("Missing section for this sectional PDF.", 400);
    }

    query = query.eq("section_name", sectionName);
    query =
      typeof params.moduleNumber === "number"
        ? query.eq("module_number", params.moduleNumber)
        : query.is("module_number", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new PdfAssetError(error.message, 500);
  }

  if (!data) {
    throw new PdfAssetError("No Google Drive PDF has been published for this test yet.", 404);
  }

  return data as TestPdfAssetRow;
}

async function getLatestReadableLocalPdfAsset(params: PdfDownloadParams, activeAsset: TestPdfAssetRow) {
  const activeLocalSource = await getLocalPdfStreamSourceForAsset(activeAsset);
  if (activeLocalSource) {
    return activeLocalSource;
  }

  const supabase = createSupabaseAdminClient();
  const sectionName = parseSectionName(params.sectionName);
  let query = supabase
    .from("test_pdf_assets")
    .select("id, test_id, section_name, module_number, mode, asset_kind, object_key, file_name, content_type, file_size_bytes, version, storage_provider, drive_file_id, drive_folder_id")
    .eq("test_id", params.testId)
    .eq("mode", params.mode)
    .eq("asset_kind", "flattened_pdf")
    .eq("storage_provider", "google_drive")
    .order("version", { ascending: false });

  if (params.mode === "full") {
    query = query.is("section_name", null).is("module_number", null);
  } else {
    if (!sectionName) {
      return null;
    }

    query = query.eq("section_name", sectionName);
    query =
      typeof params.moduleNumber === "number"
        ? query.eq("module_number", params.moduleNumber)
        : query.is("module_number", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new PdfAssetError(error.message, 500);
  }

  for (const asset of (data ?? []) as TestPdfAssetRow[]) {
    const localSource = await getLocalPdfStreamSourceForAsset(asset);
    if (localSource) {
      return localSource;
    }
  }

  return null;
}

async function getDrivePdfStream(asset: TestPdfAssetRow) {
  if (!asset.drive_file_id) {
    throw new PdfAssetError("This PDF asset is missing its Google Drive file id.", 500);
  }

  try {
    const response = await getGoogleDriveClient().files.get(
      {
        fileId: asset.drive_file_id,
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "stream",
      },
    );

    return {
      body: response.data,
      contentType: response.headers["content-type"],
      contentLength: response.headers["content-length"],
    };
  } catch (error: unknown) {
    const maybeStatus = typeof error === "object" && error && "code" in error ? Number((error as { code?: unknown }).code) : undefined;

    if (maybeStatus === 404) {
      throw new PdfAssetError(`The PDF file was not found in Google Drive for file id: ${asset.drive_file_id}`, 404);
    }

    if (maybeStatus === 401 || maybeStatus === 403) {
      throw new PdfAssetError("Google Drive denied access to this PDF. Check OAuth credentials and file permissions.", 502);
    }

    throw error;
  }
}

function getErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function getPdfStreamSource(params: PdfDownloadParams, activeAsset: TestPdfAssetRow): Promise<PdfStreamSource> {
  try {
    const driveResponse = await getDrivePdfStream(activeAsset);
    return {
      asset: activeAsset,
      body: driveResponse.body,
      contentType: driveResponse.contentType,
      contentLength: driveResponse.contentLength,
    };
  } catch (error) {
    const localSource = await getLatestReadableLocalPdfAsset(params, activeAsset);
    if (localSource) {
      console.warn("Google Drive PDF stream failed; using local PDF asset fallback.", {
        testId: params.testId,
        mode: params.mode,
        sectionName: localSource.asset.section_name,
        moduleNumber: localSource.asset.module_number,
        version: localSource.asset.version,
        error: getErrorSummary(error),
      });
      return localSource;
    }

    throw error;
  }
}

export async function getPdfDownload({
  session,
  params,
  ipAddress,
  userAgent,
}: {
  session: AppSession;
  params: PdfDownloadParams;
  ipAddress?: string;
  userAgent?: string;
}) {
  const test = await getTest(session, params.testId);
  await assertTokenAccess(session, params.testId, params.token);

  const asset = await getActivePdfAsset(params);
  const streamSource = await getPdfStreamSource(params, asset);

  const supabase = createSupabaseAdminClient();
  await supabase.from("test_pdf_download_events").insert({
    user_id: session.user.id,
    test_id: params.testId,
    pdf_asset_id: streamSource.asset.id,
    mode: params.mode,
    section_name: streamSource.asset.section_name,
    module_number: streamSource.asset.module_number,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  return {
    asset: streamSource.asset,
    stream: bodyToWebStream(streamSource.body),
    fileName: getPdfDownloadFileName(test, streamSource.asset),
    contentType: streamSource.contentType || streamSource.asset.content_type || "application/pdf",
    contentLength: streamSource.contentLength ? Number(streamSource.contentLength) : streamSource.asset.file_size_bytes ?? undefined,
  };
}
