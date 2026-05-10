import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generatePDFTemplate } from "@/utils/questionTemplate";
import { buildTestEntryHref } from "@/lib/testEntryLinks";
import { MATH_SECTION, VERBAL_SECTION, isVerbalSection, normalizeSectionName } from "@/lib/sections";
import QRCode from "qrcode";

const OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || path.join(os.homedir(), "Desktop", "flattened-pdfs");
const HTML_DIR = path.join(OUTPUT_DIR, "_html");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const PUBLIC_FILE_BASE = pathToFileURL(PUBLIC_DIR).href.replace(/\/$/, "");
const LOCAL_ORIGIN = process.env.PDF_TEST_ORIGIN || "https://learn.ronansat.com";
const FORCE_RENDER = process.env.PDF_FORCE === "1";

function getBrowserPath() {
  const explicitPath = process.env.PDF_BROWSER_PATH?.trim();
  if (explicitPath && existsSync(explicitPath)) return explicitPath;
  const candidates = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : null,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe") : null,
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c!)) return c!;
  throw new Error("No Chromium browser found.");
}

function sanitizeFilePart(value: string) {
  return value.replace(/[<>:"/\\|?*\0-\x1F]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "untitled";
}

function normalizeHtmlForFileRendering(html: string) {
  return html.replaceAll('src="/', `src="${PUBLIC_FILE_BASE}/`).replaceAll("src='/", `src='${PUBLIC_FILE_BASE}/`).replaceAll('href="/', `href="${PUBLIC_FILE_BASE}/`).replaceAll("href='/", `href='${PUBLIC_FILE_BASE}/`);
}

type QuestionRow = any;

function toPrintableQuestion(question: QuestionRow) {
  const sortedOptions = [...(question.question_options ?? [])].sort((a: any, b: any) => a.display_order - b.display_order);
  const correctOption = question.question_correct_options ? sortedOptions.find((o: any) => o.id === question.question_correct_options?.option_id) : null;
  const sortedSprAnswers = [...(question.question_spr_accepted_answers ?? [])].sort((a: any, b: any) => a.display_order - b.display_order);
  const section = question.test_sections;
  return {
    _id: question.id, testId: section?.test_id, order: question.position,
    section: section?.name, module: section?.module_number ?? 1,
    questionType: question.question_type, questionText: question.question_text,
    passage: question.passage ?? undefined,
    choices: sortedOptions.map((o: any) => o.option_text),
    correctAnswer: correctOption?.option_text,
    sprAnswers: sortedSprAnswers.map((a: any) => a.accepted_answer),
    explanation: question.explanation, difficulty: question.difficulty,
    points: question.points, domain: question.domain ?? undefined,
    skill: question.skill ?? undefined, imageUrl: question.image_url ?? undefined,
    extra: question.extra,
  };
}

async function fetchNewTests() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("tests").select(`id, title, test_sections (id, name, module_number, display_order)`)
    .gte("created_at", "2026-05-09").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

async function fetchQuestions(testId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("questions").select(`
    id, section_id, question_type, question_text, passage, explanation, difficulty, points,
    domain, skill, image_url, extra, position,
    question_options (id, option_text, display_order),
    question_correct_options (option_id),
    question_spr_accepted_answers (accepted_answer, display_order),
    test_sections!inner (test_id, name, module_number, display_order)
  `).eq("test_sections.test_id", testId)
    .order("display_order", { referencedTable: "test_sections", ascending: true })
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(toPrintableQuestion);
}

async function renderPdf(browserPath: string, htmlPath: string, pdfPath: string) {
  if (!FORCE_RENDER && existsSync(pdfPath)) return pdfPath;
  const userDataDir = path.join(os.tmpdir(), `ronan-pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(userDataDir, { recursive: true });
  const args = ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${userDataDir}`, "--allow-file-access-from-files", "--disable-web-security",
    "--print-to-pdf-no-header", `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href];
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(browserPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Timeout")); }, 90000);
      child.stderr.on("data", () => {});
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0 && existsSync(pdfPath)) resolve();
        else reject(new Error(`Browser exit code ${code}`));
      });
    });
  } finally { await rm(userDataDir, { recursive: true, force: true }); }
  return pdfPath;
}

async function main() {
  const browserPath = getBrowserPath();
  const tests = await fetchNewTests();
  console.log(`New tests to render: ${tests.length}`);
  console.log(`Browser: ${browserPath}`);
  let done = 0;

  for (const test of tests) {
    const questions = await fetchQuestions(test.id);
    if (questions.length === 0) { console.warn(`Skip ${test.title}: no questions`); continue; }
    const folderName = sanitizeFilePart(`${test.title} - ${test.id}`);

    // Full-length
    const fullFolder = path.join(OUTPUT_DIR, "full-length", folderName);
    const fullPdf = path.join(fullFolder, `${sanitizeFilePart(test.title)} - full.pdf`);
    const fullHtml = path.join(HTML_DIR, `${test.id}-full.html`);
    await mkdir(fullFolder, { recursive: true });
    await mkdir(HTML_DIR, { recursive: true });
    if (!FORCE_RENDER && existsSync(fullPdf)) { done++; continue; }

    const testingRoomUrl = new URL(buildTestEntryHref(test.id, { mode: "full" }), LOCAL_ORIGIN).toString();
    const qrSvg = (await QRCode.toString(testingRoomUrl, { type: "svg", errorCorrectionLevel: "H", margin: 1, width: 224, color: { dark: "#111111", light: "#ffffff" } })).replace(/^<\?xml[^>]*>\s*/, "");
    const html = await generatePDFTemplate({ testId: test.id, testTitle: test.title, questions, sectionName: undefined, documentTitle: `RONAN SAT - ${test.title}`, assetBaseUrl: PUBLIC_FILE_BASE, testingRoomUrl, testingRoomQrSvg: qrSvg });
    await writeFile(fullHtml, normalizeHtmlForFileRendering(html), "utf8");
    await renderPdf(browserPath, fullHtml, fullPdf);
    done++;
    console.log(`[${done}/${tests.length}] Full: ${fullPdf}`);

    // Sectional: Verbal
    const verbalQs = questions.filter((q: any) => isVerbalSection(q.section));
    if (verbalQs.length > 0) {
      const vFolder = path.join(OUTPUT_DIR, "sectional", "Verbal", folderName);
      const vPdf = path.join(vFolder, `${sanitizeFilePart(test.title)} - Verbal.pdf`);
      const vHtml = path.join(HTML_DIR, `${test.id}-verbal.html`);
      await mkdir(vFolder, { recursive: true });
      if (!FORCE_RENDER || !existsSync(vPdf)) {
        const vHtmlContent = await generatePDFTemplate({ testId: test.id, testTitle: test.title, questions: verbalQs, sectionName: VERBAL_SECTION, documentTitle: `RONAN SAT - ${test.title} - Reading and Writing`, assetBaseUrl: PUBLIC_FILE_BASE, testingRoomUrl: new URL(buildTestEntryHref(test.id, { mode: "sectional", sectionName: VERBAL_SECTION }), LOCAL_ORIGIN).toString(), testingRoomQrSvg: qrSvg });
        await writeFile(vHtml, normalizeHtmlForFileRendering(vHtmlContent), "utf8");
        await renderPdf(browserPath, vHtml, vPdf);
      }
    }

    // Sectional: Math
    const mathQs = questions.filter((q: any) => normalizeSectionName(q.section) === MATH_SECTION);
    if (mathQs.length > 0) {
      const mFolder = path.join(OUTPUT_DIR, "sectional", "Math", folderName);
      const mPdf = path.join(mFolder, `${sanitizeFilePart(test.title)} - Math.pdf`);
      const mHtml = path.join(HTML_DIR, `${test.id}-math.html`);
      await mkdir(mFolder, { recursive: true });
      if (!FORCE_RENDER || !existsSync(mPdf)) {
        const mHtmlContent = await generatePDFTemplate({ testId: test.id, testTitle: test.title, questions: mathQs, sectionName: MATH_SECTION, documentTitle: `RONAN SAT - ${test.title} - Math`, assetBaseUrl: PUBLIC_FILE_BASE, testingRoomUrl: new URL(buildTestEntryHref(test.id, { mode: "sectional", sectionName: MATH_SECTION }), LOCAL_ORIGIN).toString(), testingRoomQrSvg: qrSvg });
        await writeFile(mHtml, normalizeHtmlForFileRendering(mHtmlContent), "utf8");
        await renderPdf(browserPath, mHtml, mPdf);
      }
    }

    done++;
    console.log(`[${done}/${tests.length}] ${test.title}`);
  }
  console.log(`Done. Rendered ${done} tests.`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
