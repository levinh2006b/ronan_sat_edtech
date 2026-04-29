import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import QRCode from "qrcode";

import type { QuestionExtra } from "@/lib/questionExtra";
import { buildTestEntryHref } from "@/lib/testEntryLinks";
import { MATH_SECTION, VERBAL_SECTION, isVerbalSection, normalizeSectionName } from "@/lib/sections";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generatePDFTemplate } from "@/utils/questionTemplate";

type BrowserRenderResult = {
  outputPath: string;
};

type TestRow = {
  id: string;
  title: string;
  test_sections: Array<{
    id: string;
    name: string;
    module_number: number | null;
    display_order: number;
  }> | null;
};

type QuestionRow = {
  id: string;
  section_id: string;
  question_type: "multiple_choice" | "spr";
  question_text: string;
  passage: string | null;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  domain: string | null;
  skill: string | null;
  image_url: string | null;
  extra: unknown;
  position: number;
  question_options: Array<{
    id: string;
    option_text: string;
    display_order: number;
  }> | null;
  question_correct_options: {
    option_id: string;
  } | null;
  question_spr_accepted_answers: Array<{
    accepted_answer: string;
    display_order: number;
  }> | null;
  test_sections: {
    test_id: string;
    name: string;
    module_number: number | null;
    display_order: number;
  } | null;
};

type PrintableQuestion = {
  _id: string;
  testId?: string;
  order: number;
  section?: string;
  module: number;
  questionType: "multiple_choice" | "spr";
  questionText: string;
  passage?: string;
  choices?: string[];
  correctAnswer?: string;
  sprAnswers?: string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  domain?: string;
  skill?: string;
  imageUrl?: string;
  extra?: QuestionExtra | null;
};

const OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || path.join(os.homedir(), "Desktop", "flattened-pdfs");
const HTML_DIR = path.join(OUTPUT_DIR, "_html");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const PUBLIC_FILE_BASE = pathToFileURL(PUBLIC_DIR).href.replace(/\/$/, "");
const LOCAL_ORIGIN = process.env.PDF_TEST_ORIGIN || "https://learn.ronansat.com";
const FORCE_RENDER = process.env.PDF_FORCE === "1" || process.env.PDF_FORCE === "true";
const RENDER_TIMEOUT_MS = Number.parseInt(process.env.PDF_RENDER_TIMEOUT_MS ?? "90000", 10);

function getBrowserPath() {
  const explicitPath = process.env.PDF_BROWSER_PATH?.trim();
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`PDF_BROWSER_PATH does not exist: ${explicitPath}`);
    }

    return explicitPath;
  }

  const candidates = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : null,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe") : null,
    process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe") : null,
  ].filter((candidate): candidate is string => Boolean(candidate));

  const browserPath = candidates.find((candidate) => existsSync(candidate));
  if (!browserPath) {
    throw new Error("Could not find a Chromium-family browser. Install Microsoft Edge/Chrome or set PDF_BROWSER_PATH.");
  }

  return browserPath;
}

function sanitizeFilePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "untitled";
}

function normalizeHtmlForFileRendering(html: string) {
  return html
    .replaceAll('src="/', `src="${PUBLIC_FILE_BASE}/`)
    .replaceAll("src='/", `src='${PUBLIC_FILE_BASE}/`)
    .replaceAll('href="/', `href="${PUBLIC_FILE_BASE}/`)
    .replaceAll("href='/", `href='${PUBLIC_FILE_BASE}/`);
}

function toPrintableQuestion(question: QuestionRow): PrintableQuestion {
  const sortedOptions = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
  const correctOption = question.question_correct_options
    ? sortedOptions.find((option) => option.id === question.question_correct_options?.option_id)
    : null;
  const sortedSprAnswers = [...(question.question_spr_accepted_answers ?? [])].sort((left, right) => left.display_order - right.display_order);
  const section = question.test_sections;

  return {
    _id: question.id,
    testId: section?.test_id,
    order: question.position,
    section: section?.name,
    module: section?.module_number ?? 1,
    questionType: question.question_type,
    questionText: question.question_text,
    passage: question.passage ?? undefined,
    choices: sortedOptions.map((option) => option.option_text),
    correctAnswer: correctOption?.option_text,
    sprAnswers: sortedSprAnswers.map((answer) => answer.accepted_answer),
    explanation: question.explanation,
    difficulty: question.difficulty,
    points: question.points,
    domain: question.domain ?? undefined,
    skill: question.skill ?? undefined,
    imageUrl: question.image_url ?? undefined,
    extra: question.extra as QuestionExtra | null | undefined,
  };
}

async function fetchTests() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tests")
    .select(
      `
        id,
        title,
        test_sections (
          id,
          name,
          module_number,
          display_order
        )
      `,
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TestRow[];
}

async function fetchQuestions(testId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
        id,
        section_id,
        question_type,
        question_text,
        passage,
        explanation,
        difficulty,
        points,
        domain,
        skill,
        image_url,
        extra,
        position,
        question_options (
          id,
          option_text,
          display_order
        ),
        question_correct_options (
          option_id
        ),
        question_spr_accepted_answers (
          accepted_answer,
          display_order
        ),
        test_sections!inner (
          test_id,
          name,
          module_number,
          display_order
        )
      `,
    )
    .eq("test_sections.test_id", testId)
    .order("display_order", { referencedTable: "test_sections", ascending: true })
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as QuestionRow[]).map(toPrintableQuestion);
}

async function renderPdf(browserPath: string, htmlPath: string, pdfPath: string): Promise<BrowserRenderResult> {
  if (!FORCE_RENDER && existsSync(pdfPath)) {
    return { outputPath: pdfPath };
  }

  const userDataDir = path.join(os.tmpdir(), `ronan-pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(userDataDir, { recursive: true });

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${userDataDir}`,
    "--allow-file-access-from-files",
    "--disable-web-security",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ];

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(browserPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      const timeout = Number.isFinite(RENDER_TIMEOUT_MS) && RENDER_TIMEOUT_MS > 0
        ? setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error(`Browser PDF render timed out after ${RENDER_TIMEOUT_MS}ms for ${htmlPath}.`));
          }, RENDER_TIMEOUT_MS)
        : null;

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", reject);
      child.on("close", (code) => {
        if (timeout) {
          clearTimeout(timeout);
        }

        if (code === 0 && existsSync(pdfPath)) {
          resolve();
          return;
        }

        reject(new Error(`Browser PDF render failed for ${htmlPath} with code ${code ?? "unknown"}.\n${stderr.trim()}`));
      });
    });
  } finally {
    await rm(userDataDir, { recursive: true, force: true });
  }

  return { outputPath: pdfPath };
}

async function buildTestingRoomQr(testId: string, mode: "full" | "sectional", sectionName?: string) {
  const testingRoomUrl = new URL(
    buildTestEntryHref(testId, {
      mode,
      sectionName,
    }),
    LOCAL_ORIGIN,
  ).toString();

  const testingRoomQrSvg = (await QRCode.toString(testingRoomUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 224,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  })).replace(/^<\?xml[^>]*>\s*/, "");

  return { testingRoomUrl, testingRoomQrSvg };
}

async function writeBookletPdf(params: {
  browserPath: string;
  test: TestRow;
  mode: "full" | "sectional";
  sectionName?: string;
  questions: PrintableQuestion[];
}) {
  const { browserPath, test, mode, sectionName, questions } = params;
  const folderName = sanitizeFilePart(`${test.title} - ${test.id}`);
  const sectionFolder = sectionName ? sanitizeFilePart(sectionName) : "";
  const outputFolder =
    mode === "full"
      ? path.join(OUTPUT_DIR, "full-length", folderName)
      : path.join(OUTPUT_DIR, "sectional", sectionFolder, folderName);
  const baseFileName = sanitizeFilePart(mode === "full" ? `${test.title} - full` : `${test.title} - ${sectionName}`);
  const htmlPath = path.join(HTML_DIR, `${test.id}-${mode}${sectionName ? `-${sanitizeFilePart(sectionName)}` : ""}.html`);
  const pdfPath = path.join(outputFolder, `${baseFileName}.pdf`);
  const documentTitle = `RONAN SAT - ${test.title}${sectionName ? ` - ${sectionName}` : ""}`;
  const { testingRoomUrl, testingRoomQrSvg } = await buildTestingRoomQr(test.id, mode, sectionName);

  await mkdir(outputFolder, { recursive: true });
  await mkdir(HTML_DIR, { recursive: true });

  if (!FORCE_RENDER && existsSync(pdfPath)) {
    return pdfPath;
  }

  const html = await generatePDFTemplate({
    testId: test.id,
    testTitle: test.title,
    questions,
    sectionName,
    documentTitle,
    assetBaseUrl: PUBLIC_FILE_BASE,
    testingRoomUrl,
    testingRoomQrSvg,
  });

  await writeFile(htmlPath, normalizeHtmlForFileRendering(html), "utf8");
  const result = await renderPdf(browserPath, htmlPath, pdfPath);

  return result.outputPath;
}

function getSectionalTargets(questions: PrintableQuestion[]) {
  const hasVerbal = questions.some((question) => isVerbalSection(question.section));
  const hasMath = questions.some((question) => normalizeSectionName(question.section) === MATH_SECTION);

  return [
    ...(hasVerbal ? [VERBAL_SECTION] : []),
    ...(hasMath ? [MATH_SECTION] : []),
  ];
}

async function main() {
  const browserPath = getBrowserPath();
  const tests = await fetchTests();
  let renderedCount = 0;
  let skippedCount = 0;

  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Output folder: ${OUTPUT_DIR}`);
  console.log(`Browser: ${browserPath}`);
  console.log(`Found ${tests.length} tests in Supabase.`);

  for (const test of tests) {
    const questions = await fetchQuestions(test.id);
    if (questions.length === 0) {
      skippedCount += 1;
      console.warn(`Skipping "${test.title}" (${test.id}) because it has no questions.`);
      continue;
    }

    const fullPdfPath = await writeBookletPdf({
      browserPath,
      test,
      mode: "full",
      questions,
    });
    renderedCount += 1;
    console.log(`Wrote full-length PDF: ${fullPdfPath}`);

    for (const sectionName of getSectionalTargets(questions)) {
      const sectionQuestions = questions.filter((question) => normalizeSectionName(question.section) === sectionName);
      const sectionalPdfPath = await writeBookletPdf({
        browserPath,
        test,
        mode: "sectional",
        sectionName,
        questions: sectionQuestions,
      });
      renderedCount += 1;
      console.log(`Wrote sectional PDF: ${sectionalPdfPath}`);
    }
  }

  console.log(`Done. Rendered ${renderedCount} PDFs. Skipped ${skippedCount} tests.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
