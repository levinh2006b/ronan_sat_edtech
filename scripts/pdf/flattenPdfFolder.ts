import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";

type PdfFailure = {
  inputPath: string;
  error: unknown;
};

type PdfProcessResult = {
  pageCount: number;
  inputBytes: number;
  outputBytes: number;
  outputPath: string;
};

type PdfCanvas = ReturnType<typeof createCanvas>;

const PDF_DPI = Number.parseInt(process.env.PDF_DPI ?? "135", 10);
const JPEG_QUALITY = Number.parseInt(process.env.PDF_JPEG_QUALITY ?? "62", 10);
const USE_GRAYSCALE = process.env.PDF_GRAYSCALE !== "0" && process.env.PDF_GRAYSCALE !== "false";
const PDF_POINTS_PER_INCH = 72;
const RENDER_SCALE = PDF_DPI / PDF_POINTS_PER_INCH;
const DEFAULT_INPUT_DIR = path.join(os.homedir(), "Desktop", "flattened-pdfs");
const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), "Desktop", "image-only-pdfs");
const FORCE_RENDER = process.env.PDF_FORCE === "1" || process.env.PDF_FORCE === "true";

function getConfiguredPaths() {
  const [, , inputArg, outputArg] = process.argv;

  return {
    inputDir: path.resolve(inputArg || process.env.PDF_INPUT_DIR || DEFAULT_INPUT_DIR),
    outputDir: path.resolve(outputArg || process.env.PDF_OUTPUT_DIR || DEFAULT_OUTPUT_DIR),
  };
}

function assertSafeDirectoryPair(inputDir: string, outputDir: string) {
  const relativeOutput = path.relative(inputDir, outputDir);

  if (inputDir === outputDir || (relativeOutput && !relativeOutput.startsWith("..") && !path.isAbsolute(relativeOutput))) {
    throw new Error("Output directory must not be the same as, or inside, the input directory.");
  }
}

async function collectPdfPaths(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedPaths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectPdfPaths(entryPath);
      }

      return entry.isFile() && entry.name.toLowerCase().endsWith(".pdf") ? [entryPath] : [];
    }),
  );

  return nestedPaths.flat().sort((left, right) => left.localeCompare(right));
}

function getOutputPath(inputPath: string, inputDir: string, outputDir: string) {
  const relativePath = path.relative(inputDir, inputPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Input PDF is outside the input directory: ${inputPath}`);
  }

  return path.join(outputDir, relativePath);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

async function renderPageToJpeg(page: pdfjs.PDFPageProxy) {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  try {
    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    const pngBuffer = canvas.toBuffer("image/png");

    const pipeline = sharp(pngBuffer);
    if (USE_GRAYSCALE) {
      pipeline.grayscale();
    }

    return await pipeline
      .jpeg({
        quality: JPEG_QUALITY,
        chromaSubsampling: "4:2:0",
        mozjpeg: true,
      })
      .toBuffer();
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function processPdf(inputPath: string, outputPath: string): Promise<PdfProcessResult> {
  const inputBytes = await readFile(inputPath);
  const inputStats = await stat(inputPath);
  const sourceDoc = await pdfjs.getDocument({
    data: new Uint8Array(inputBytes),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
  } as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const outputDoc = await PDFDocument.create();

  try {
    for (let pageNumber = 1; pageNumber <= sourceDoc.numPages; pageNumber += 1) {
      const page = await sourceDoc.getPage(pageNumber);
      try {
        const originalViewport = page.getViewport({ scale: 1 });
        const jpegBuffer = await renderPageToJpeg(page);
        const embeddedImage = await outputDoc.embedJpg(jpegBuffer);
        const outputPage = outputDoc.addPage([originalViewport.width, originalViewport.height]);

        outputPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });

        console.log(`Processed page ${pageNumber}/${sourceDoc.numPages} of file ${path.basename(inputPath)}`);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await sourceDoc.destroy();
  }

  const outputBytes = await outputDoc.save({
    addDefaultPage: false,
    objectsPerTick: 25,
    useObjectStreams: true,
  });

  await writePdfAtomically(outputPath, outputBytes);

  return {
    pageCount: sourceDoc.numPages,
    inputBytes: inputStats.size,
    outputBytes: outputBytes.length,
    outputPath,
  };
}

async function isReadablePdf(outputPath: string) {
  try {
    const fileStats = await stat(outputPath);
    if (fileStats.size <= 0) {
      return false;
    }

    const outputBytes = await readFile(outputPath);
    await PDFDocument.load(outputBytes, {
      updateMetadata: false,
    });
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

async function main() {
  const { inputDir, outputDir } = getConfiguredPaths();
  assertSafeDirectoryPair(inputDir, outputDir);

  if (!existsSync(inputDir)) {
    throw new Error(`Input PDF folder does not exist: ${inputDir}`);
  }

  await mkdir(outputDir, { recursive: true });

  const pdfPaths = await collectPdfPaths(inputDir);
  const failures: PdfFailure[] = [];
  let processedCount = 0;
  let skippedCount = 0;
  let totalPages = 0;

  console.log(`Input folder: ${inputDir}`);
  console.log(`Output folder: ${outputDir}`);
  console.log(`Raster profile: ${PDF_DPI} DPI, JPEG quality ${JPEG_QUALITY}, grayscale ${USE_GRAYSCALE ? "on" : "off"}`);
  console.log(`Found ${pdfPaths.length} PDF files.`);

  for (const [index, inputPath] of pdfPaths.entries()) {
    const outputPath = getOutputPath(inputPath, inputDir, outputDir);
    console.log(`Processing file ${index + 1}/${pdfPaths.length}: ${inputPath}`);

    try {
      if (!FORCE_RENDER && existsSync(outputPath) && await isReadablePdf(outputPath)) {
        skippedCount += 1;
        console.log(`Skipped existing output: ${outputPath}`);
        continue;
      }

      const result = await processPdf(inputPath, outputPath);
      if (!await isReadablePdf(outputPath)) {
        throw new Error(`Output PDF is not readable: ${outputPath}`);
      }

      processedCount += 1;
      totalPages += result.pageCount;
      console.log(
        `Wrote ${result.outputPath} (${formatBytes(result.inputBytes)} -> ${formatBytes(result.outputBytes)})`,
      );
    } catch (error) {
      failures.push({ inputPath, error });
      console.error(`Failed to process ${inputPath}`);
      console.error(error);
    }
  }

  console.log(`Done. Processed ${processedCount}/${pdfPaths.length} PDFs, skipped ${skippedCount}, and rendered ${totalPages} pages.`);

  if (failures.length > 0) {
    console.error("Failures:");
    for (const failure of failures) {
      console.error(`- ${failure.inputPath}: ${failure.error instanceof Error ? failure.error.message : String(failure.error)}`);
    }

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
