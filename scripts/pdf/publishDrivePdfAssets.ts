import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

import { getGoogleDriveClient } from "@/lib/googleDrive/client";
import { getGoogleDrivePdfRootFolderId } from "@/lib/googleDrive/env";
import { MATH_SECTION, VERBAL_SECTION } from "@/lib/sections";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PdfMode = "full" | "sectional";
type SectionName = typeof VERBAL_SECTION | typeof MATH_SECTION;

type AssetTarget = {
  inputPath: string;
  testId: string;
  mode: PdfMode;
  sectionName: SectionName | null;
  moduleNumber: number | null;
  kind: "full" | "verbal" | "math";
};

type CliOptions = {
  execute: boolean;
  inputDir: string;
  outputDir: string;
  testId?: string;
  limit?: number;
  offset: number;
  skipPublished: boolean;
  onlyPublished: boolean;
  mode: "all" | PdfMode;
  sectionName?: SectionName;
  mathAffected: boolean;
};

type ActiveAssetRow = {
  test_id: string;
  mode: PdfMode;
  section_name: string | null;
  module_number: number | null;
  asset_kind: string;
  id: string;
  version: number;
};

type TestTitleRow = {
  id: string;
  title: string;
};

type RasterResult = {
  pageCount: number;
  inputBytes: number;
  outputBytes: number;
};

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const STRICT_FILE_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(full|verbal|math)\.pdf$/i;
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const PDF_DPI = Number.parseInt(process.env.PDF_DPI ?? "300", 10);
const JPEG_QUALITY = Number.parseInt(process.env.PDF_JPEG_QUALITY ?? "80", 10);
const JPEG_CHROMA_SUBSAMPLING = process.env.PDF_JPEG_CHROMA_SUBSAMPLING ?? "4:4:4";
const USE_GRAYSCALE = process.env.PDF_GRAYSCALE === "1" || process.env.PDF_GRAYSCALE === "true";
const FORCE_RASTER = process.env.PDF_FORCE === "1" || process.env.PDF_FORCE === "true";
const PDFTOPPM_PATH = process.env.PDFTOPPM_PATH || "C:\\poppler-25.12.0\\Library\\bin\\pdftoppm.exe";
const DEFAULT_INPUT_DIR = path.join(os.homedir(), "Desktop", "flattened-pdfs");
const DEFAULT_OUTPUT_DIR = "D:\\image-only-pdfs";

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let execute = false;
  let inputDir = process.env.PDF_INPUT_DIR || DEFAULT_INPUT_DIR;
  let outputDir = process.env.PDF_OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
  let testId: string | undefined;
  let limit: number | undefined;
  let offset = 0;
  let skipPublished = false;
  let onlyPublished = false;
  let mode: CliOptions["mode"] = "all";
  let sectionName: SectionName | undefined;
  let mathAffected = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--execute") {
      execute = true;
    } else if (arg === "--skip-published") {
      skipPublished = true;
    } else if (arg === "--only-published") {
      onlyPublished = true;
    } else if (arg === "--mode" && next) {
      const normalizedMode = next.trim().toLowerCase();
      if (!["all", "full", "sectional"].includes(normalizedMode)) {
        throw new Error(`Invalid --mode value: ${next}`);
      }
      mode = normalizedMode as CliOptions["mode"];
      index += 1;
    } else if (arg === "--section" && next) {
      if (next.trim().toLowerCase() === "math") {
        sectionName = MATH_SECTION;
      } else if (next.trim().toLowerCase() === "verbal" || next.trim().toLowerCase() === "reading and writing") {
        sectionName = VERBAL_SECTION;
      } else {
        throw new Error(`Invalid --section value: ${next}`);
      }
      index += 1;
    } else if (arg === "--math-affected") {
      mathAffected = true;
    } else if (arg === "--input-dir" && next) {
      inputDir = next;
      index += 1;
    } else if (arg === "--output-dir" && next) {
      outputDir = next;
      index += 1;
    } else if (arg === "--test-id" && next) {
      testId = next.trim();
      index += 1;
    } else if (arg === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      limit = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
      index += 1;
    } else if (arg === "--offset" && next) {
      const parsed = Number.parseInt(next, 10);
      offset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (mathAffected) {
    mode = "all";
    sectionName = MATH_SECTION;
  }

  return {
    execute,
    inputDir: path.resolve(inputDir),
    outputDir: path.resolve(outputDir),
    testId,
    limit,
    offset,
    skipPublished,
    onlyPublished,
    mode,
    sectionName,
    mathAffected,
  };
}

async function collectPdfPaths(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectPdfPaths(entryPath);
      }

      return entry.isFile() && entry.name.toLowerCase().endsWith(".pdf") ? [entryPath] : [];
    }),
  );

  return nested.flat().sort((left, right) => left.localeCompare(right));
}

function strictTarget(filePath: string): AssetTarget | null {
  const match = path.basename(filePath).match(STRICT_FILE_PATTERN);
  if (!match) {
    return null;
  }

  return buildTarget(filePath, match[1], match[2].toLowerCase() as AssetTarget["kind"]);
}

function legacyTarget(filePath: string): AssetTarget | null {
  const normalized = filePath.replace(/\\/g, "/");
  const uuid = normalized.match(UUID_PATTERN)?.[0];
  if (!uuid) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("/full-length/")) {
    return buildTarget(filePath, uuid, "full");
  }

  if (lower.includes("/sectional/verbal/") || lower.endsWith(" - verbal.pdf")) {
    return buildTarget(filePath, uuid, "verbal");
  }

  if (lower.includes("/sectional/math/") || lower.endsWith(" - math.pdf")) {
    return buildTarget(filePath, uuid, "math");
  }

  return null;
}

function buildTarget(inputPath: string, testId: string, kind: AssetTarget["kind"]): AssetTarget {
  return {
    inputPath,
    testId,
    kind,
    mode: kind === "full" ? "full" : "sectional",
    sectionName: kind === "verbal" ? VERBAL_SECTION : kind === "math" ? MATH_SECTION : null,
    moduleNumber: null,
  };
}

function getLogicalObjectKey(target: AssetTarget, version: number) {
  if (target.mode === "full") {
    return `test-pdfs/${target.testId}/full/v${version}.pdf`;
  }

  return `test-pdfs/${target.testId}/sectional/${target.kind}/v${version}.pdf`;
}

function getRasterOutputPath(outputDir: string, target: AssetTarget, version: number) {
  return path.join(outputDir, ...getLogicalObjectKey(target, version).split("/"));
}

function sanitizeDownloadFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\r\n"]/g, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim();
  return cleaned || "ronan-sat-practice.pdf";
}

function getDownloadFileName(target: AssetTarget, title?: string) {
  const baseTitle = title?.trim() || target.testId;
  if (target.mode === "sectional" && target.sectionName) {
    return sanitizeDownloadFileName(`Ronan SAT - ${baseTitle} - ${target.sectionName}.pdf`);
  }

  return sanitizeDownloadFileName(`Ronan SAT - ${baseTitle}.pdf`);
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 1 : 2)} ${units[unitIndex]}`;
}

async function isReadablePdf(filePath: string) {
  try {
    const bytes = await readFile(filePath);
    await PDFDocument.load(bytes, { updateMetadata: false });
    return true;
  } catch {
    return false;
  }
}

async function writePdfAtomically(outputPath: string, outputBytes: Uint8Array) {
  const outputDir = path.dirname(outputPath);
  const tempPath = path.join(outputDir, `.${path.basename(outputPath)}.${process.pid}.${Date.now()}.partial`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(tempPath, outputBytes);

  try {
    if (existsSync(outputPath)) {
      await rm(outputPath, { force: true });
    }
    await rename(tempPath, outputPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function renderPageToPng(inputPath: string, pageNumber: number, tempDir: string) {
  const outputPrefix = path.join(tempDir, `page-${pageNumber}`);
  const outputPath = `${outputPrefix}.png`;
  const args = [
    "-png",
    "-singlefile",
    "-r",
    String(PDF_DPI),
    "-f",
    String(pageNumber),
    "-l",
    String(pageNumber),
    inputPath,
    outputPrefix,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(PDFTOPPM_PATH, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && existsSync(outputPath)) {
        resolve();
        return;
      }

      reject(new Error(`pdftoppm failed for page ${pageNumber} of ${inputPath} with code ${code ?? "unknown"}.\n${stderr.trim()}`));
    });
  });

  return outputPath;
}

async function compressPngToJpeg(pngPath: string) {
  const pipeline = sharp(pngPath);
  if (USE_GRAYSCALE) {
    pipeline.grayscale();
  }

  return pipeline
    .jpeg({
      quality: JPEG_QUALITY,
      chromaSubsampling: JPEG_CHROMA_SUBSAMPLING,
      mozjpeg: true,
    })
    .toBuffer();
}

async function rasterizePdf(inputPath: string, outputPath: string): Promise<RasterResult> {
  if (!FORCE_RASTER && existsSync(outputPath) && (await isReadablePdf(outputPath))) {
    const inputStats = await stat(inputPath);
    const outputStats = await stat(outputPath);
    const existingDoc = await PDFDocument.load(await readFile(outputPath), { updateMetadata: false });
    return {
      pageCount: existingDoc.getPageCount(),
      inputBytes: inputStats.size,
      outputBytes: outputStats.size,
    };
  }

  const inputStats = await stat(inputPath);
  const inputBytes = await readFile(inputPath);
  const sourceDoc = await PDFDocument.load(inputBytes, { updateMetadata: false });
  const outputDoc = await PDFDocument.create();
  const tempDir = path.join(os.tmpdir(), `ronan-poppler-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(tempDir, { recursive: true });

  try {
    const pageCount = sourceDoc.getPageCount();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const sourcePage = sourceDoc.getPage(pageNumber - 1);
      const { width, height } = sourcePage.getSize();
      const pngPath = await renderPageToPng(inputPath, pageNumber, tempDir);
      const jpeg = await compressPngToJpeg(pngPath);
      const image = await outputDoc.embedJpg(jpeg);
      const outputPage = outputDoc.addPage([width, height]);
      outputPage.drawImage(image, {
        x: 0,
        y: 0,
        width,
        height,
      });
      await rm(pngPath, { force: true });
      console.log(`Rasterized page ${pageNumber}/${pageCount} of ${path.basename(inputPath)}`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  const outputBytes = await outputDoc.save({
    addDefaultPage: false,
    objectsPerTick: 25,
    useObjectStreams: true,
  });
  await writePdfAtomically(outputPath, outputBytes);

  return {
    pageCount: sourceDoc.getPageCount(),
    inputBytes: inputStats.size,
    outputBytes: outputBytes.length,
  };
}

async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

async function getNextVersion(target: AssetTarget) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("test_pdf_assets")
    .select("id, version")
    .eq("test_id", target.testId)
    .eq("mode", target.mode)
    .eq("asset_kind", "flattened_pdf")
    .order("version", { ascending: false })
    .limit(1);

  if (target.mode === "full") {
    query = query.is("section_name", null).is("module_number", null);
  } else {
    query = query.eq("section_name", target.sectionName).is("module_number", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const latest = (data?.[0] as ActiveAssetRow | undefined)?.version ?? 0;
  return latest + 1;
}

function getAssetVersionKey(target: {
  testId: string;
  mode: PdfMode;
  sectionName: string | null;
  moduleNumber: number | null;
}) {
  return [
    target.testId,
    target.mode,
    target.sectionName ?? "",
    target.moduleNumber ?? -1,
    "flattened_pdf",
  ].join("|");
}

async function loadNextVersionMap() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("test_pdf_assets")
    .select("id, test_id, mode, section_name, module_number, asset_kind, version")
    .eq("asset_kind", "flattened_pdf");

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as ActiveAssetRow[]) {
    const key = getAssetVersionKey({
      testId: row.test_id,
      mode: row.mode,
      sectionName: row.section_name,
      moduleNumber: row.module_number,
    });
    map.set(key, Math.max(map.get(key) ?? 1, row.version + 1));
  }

  return map;
}

async function loadPublishedAssetKeySet() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("test_pdf_assets")
    .select("test_id, mode, section_name, module_number, asset_kind")
    .eq("asset_kind", "flattened_pdf")
    .eq("storage_provider", "google_drive")
    .eq("is_active", true)
    .not("drive_file_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const keys = new Set<string>();
  for (const row of (data ?? []) as ActiveAssetRow[]) {
    keys.add(getAssetVersionKey({
      testId: row.test_id,
      mode: row.mode,
      sectionName: row.section_name,
      moduleNumber: row.module_number,
    }));
  }

  return keys;
}

async function loadTestTitleMap(testIds: string[]) {
  if (testIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("tests").select("id, title").in("id", testIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(((data ?? []) as TestTitleRow[]).map((row) => [row.id, row.title]));
}

async function loadMathTestIds() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("test_sections")
    .select("test_id")
    .eq("name", MATH_SECTION);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(((data ?? []) as Array<{ test_id: string }>).map((row) => row.test_id));
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function getOrCreateDriveFolder(drive: ReturnType<typeof getGoogleDriveClient>, name: string, parentId: string, execute: boolean) {
  if (!execute) {
    return `dry-run:${parentId}/${name}`;
  }

  const query = [
    `name = '${escapeDriveQueryValue(name)}'`,
    `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    "trashed = false",
  ].join(" and ");
  const existing = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) {
    throw new Error(`Failed to create Google Drive folder: ${name}`);
  }

  return created.data.id;
}

async function ensureDriveFolderPath(drive: ReturnType<typeof getGoogleDriveClient>, rootFolderId: string, folderParts: string[], execute: boolean) {
  let parentId = rootFolderId;
  for (const part of folderParts) {
    parentId = await getOrCreateDriveFolder(drive, part, parentId, execute);
  }
  return parentId;
}

async function uploadDriveFile(drive: ReturnType<typeof getGoogleDriveClient>, filePath: string, fileName: string, folderId: string) {
  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: createReadStream(filePath),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!uploaded.data.id) {
    throw new Error(`Google Drive upload did not return a file id for ${filePath}`);
  }

  return uploaded.data.id;
}

async function publishSupabaseAsset(params: {
  target: AssetTarget;
  version: number;
  objectKey: string;
  fileName: string;
  driveFileId: string;
  driveFolderId: string;
  size: number;
  sha256: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { target } = params;
  let deactivateQuery = supabase
    .from("test_pdf_assets")
    .update({ is_active: false })
    .eq("test_id", target.testId)
    .eq("mode", target.mode)
    .eq("asset_kind", "flattened_pdf")
    .eq("is_active", true);

  if (target.mode === "full") {
    deactivateQuery = deactivateQuery.is("section_name", null).is("module_number", null);
  } else {
    deactivateQuery = deactivateQuery.eq("section_name", target.sectionName).is("module_number", null);
  }

  const { error: deactivateError } = await deactivateQuery;
  if (deactivateError) {
    throw new Error(deactivateError.message);
  }

  const { error: insertError } = await supabase.from("test_pdf_assets").insert({
    test_id: target.testId,
    section_name: target.sectionName,
    module_number: null,
    mode: target.mode,
    asset_kind: "flattened_pdf",
    object_key: params.objectKey,
    file_name: params.fileName,
    content_type: "application/pdf",
    sha256: params.sha256,
    file_size_bytes: params.size,
    version: params.version,
    is_active: true,
    storage_provider: "google_drive",
    drive_file_id: params.driveFileId,
    drive_folder_id: params.driveFolderId,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function main() {
  const options = parseArgs();
  if (!existsSync(options.inputDir)) {
    throw new Error(`Input directory does not exist: ${options.inputDir}`);
  }

  const files = await collectPdfPaths(options.inputDir);
  const discoveredTargets = files
    .map((file) => strictTarget(file) ?? legacyTarget(file))
    .filter((target): target is AssetTarget => Boolean(target))
    .filter((target) => !options.testId || target.testId === options.testId)
    .filter((target) => options.mode === "all" || target.mode === options.mode)
    .filter((target) => {
      if (!options.sectionName || target.mode !== "sectional") {
        return true;
      }

      return target.sectionName === options.sectionName;
    });
  const mathTestIds = options.mathAffected ? await loadMathTestIds() : null;
  const scopedTargets = mathTestIds
    ? discoveredTargets.filter((target) => {
        if (target.kind === "math") {
          return true;
        }

        if (target.kind === "full") {
          return mathTestIds.has(target.testId);
        }

        return false;
      })
    : discoveredTargets;
  const needsPublishedKeys = options.skipPublished || options.onlyPublished;
  const publishedKeys = needsPublishedKeys ? await loadPublishedAssetKeySet() : new Set<string>();
  const mappedTargets = scopedTargets.filter((target) => {
    const isPublished = publishedKeys.has(getAssetVersionKey(target));
    if (options.skipPublished) {
      return !isPublished;
    }

    if (options.onlyPublished) {
      return isPublished;
    }

    return true;
  });
  const targets = mappedTargets.slice(options.offset, options.limit ? options.offset + options.limit : undefined);
  const titleMap = await loadTestTitleMap([...new Set(targets.map((target) => target.testId))]);
  const unmapped = files.filter((file) => !(strictTarget(file) ?? legacyTarget(file)));
  const drive = options.execute ? getGoogleDriveClient() : (null as unknown as ReturnType<typeof getGoogleDriveClient>);
  const rootFolderId = options.execute ? getGoogleDrivePdfRootFolderId() : "dry-run-root";
  const nextVersionMap = await loadNextVersionMap();

  console.log(`Mode: ${options.execute ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Input: ${options.inputDir}`);
  console.log(`Raster output: ${options.outputDir}`);
  console.log(`Raster profile: ${PDF_DPI} DPI, JPEG quality ${JPEG_QUALITY}, chroma ${JPEG_CHROMA_SUBSAMPLING}, grayscale ${USE_GRAYSCALE ? "on" : "off"}`);
  console.log(`Mapped ${scopedTargets.length}/${files.length} PDFs after scope filters. Planning ${targets.length} asset(s).`);
  if (options.mathAffected) {
    console.log("Scope: math-affected assets only (sectional Math and full PDFs for tests with Math).");
  }
  if (options.offset > 0) {
    console.log(`Offset: skipping the first ${options.offset} mapped asset(s).`);
  }
  if (options.skipPublished) {
    console.log(`Skipping ${publishedKeys.size} already published active Google Drive asset(s).`);
  }
  if (options.onlyPublished) {
    console.log(`Restricting to ${publishedKeys.size} already published active Google Drive asset(s).`);
  }

  if (unmapped.length > 0) {
    console.warn("Unmapped PDFs:");
    for (const file of unmapped) {
      console.warn(`- ${file}`);
    }
  }

  let processed = 0;
  for (const target of targets) {
    const version = nextVersionMap.get(getAssetVersionKey(target)) ?? 1;
    const objectKey = getLogicalObjectKey(target, version);
    const rasterPath = getRasterOutputPath(options.outputDir, target, version);
    const fileName = getDownloadFileName(target, titleMap.get(target.testId));
    const folderParts = objectKey.split("/").slice(0, -1);

    console.log(`[${options.offset + processed + 1}/${mappedTargets.length}] ${target.testId} ${target.kind} -> ${objectKey}`);

    if (!options.execute) {
      console.log(`DRY RUN raster: ${target.inputPath} -> ${rasterPath}`);
      console.log(`DRY RUN upload folder: ${folderParts.join("/")}`);
      console.log(`DRY RUN Supabase version: ${version}`);
      processed += 1;
      continue;
    }

    const raster = await rasterizePdf(target.inputPath, rasterPath);
    const driveFolderId = await ensureDriveFolderPath(drive, rootFolderId, folderParts, true);
    const driveFileId = await uploadDriveFile(drive, rasterPath, fileName, driveFolderId);
    const sha256 = await sha256File(rasterPath);
    const size = (await stat(rasterPath)).size;
    await publishSupabaseAsset({
      target,
      version,
      objectKey,
      fileName,
      driveFileId,
      driveFolderId,
      size,
      sha256,
    });

    console.log(`Published ${objectKey}: ${formatBytes(raster.inputBytes)} -> ${formatBytes(raster.outputBytes)}, Drive file ${driveFileId}`);
    processed += 1;
  }

  console.log(`Done. ${options.execute ? "Published" : "Planned"} ${processed} PDF assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
