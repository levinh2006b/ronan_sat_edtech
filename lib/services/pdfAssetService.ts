import { GetObjectCommand, NoSuchKey, S3ServiceException, type GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "stream";

import type { AppSession } from "@/lib/auth/session";
import { getR2Client } from "@/lib/r2/client";
import { getR2BucketName } from "@/lib/r2/env";
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
  return fileName.replace(/[\r\n"]/g, "").trim() || "ronan-sat-practice.pdf";
}

function parseSectionName(sectionName?: string) {
  const normalized = normalizeSectionName(sectionName);
  return normalized || undefined;
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
    .select("id, test_id, section_name, module_number, mode, asset_kind, object_key, file_name, content_type, file_size_bytes, version")
    .eq("test_id", params.testId)
    .eq("mode", params.mode)
    .eq("asset_kind", "flattened_pdf")
    .eq("is_active", true)
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
    throw new PdfAssetError("No flattened PDF has been published for this test yet.", 404);
  }

  return data as TestPdfAssetRow;
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
  await getTest(session, params.testId);
  await assertTokenAccess(session, params.testId, params.token);

  const asset = await getActivePdfAsset(params);
  let objectResponse: GetObjectCommandOutput;

  try {
    objectResponse = await getR2Client().send(
      new GetObjectCommand({
        Bucket: getR2BucketName(),
        Key: asset.object_key,
      }),
    );
  } catch (error) {
    if (error instanceof NoSuchKey || (error instanceof S3ServiceException && error.name === "NoSuchKey")) {
      throw new PdfAssetError(`The PDF file was not found in R2 at object key: ${asset.object_key}`, 404);
    }

    if (error instanceof S3ServiceException && (error.name === "AccessDenied" || error.$metadata.httpStatusCode === 403)) {
      throw new PdfAssetError("R2 denied access to this PDF. Check the bucket name and R2 token permissions.", 502);
    }

    if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
      throw new PdfAssetError("R2 bucket or object was not found. Check R2_BUCKET_NAME and the object key.", 404);
    }

    throw error;
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("test_pdf_download_events").insert({
    user_id: session.user.id,
    test_id: params.testId,
    pdf_asset_id: asset.id,
    mode: params.mode,
    section_name: asset.section_name,
    module_number: asset.module_number,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  return {
    asset,
    stream: bodyToWebStream(objectResponse.Body),
    fileName: sanitizeFileName(asset.file_name),
    contentType: objectResponse.ContentType || asset.content_type || "application/pdf",
    contentLength: objectResponse.ContentLength ?? asset.file_size_bytes ?? undefined,
  };
}
