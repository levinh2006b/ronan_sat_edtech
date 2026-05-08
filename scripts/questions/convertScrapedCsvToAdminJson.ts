import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import Papa from "papaparse";
import { z } from "zod";

import { normalizeScrapedMarkdownHtml } from "@/lib/scrapedQuestionContent";
import type { AdminQuestionUploadRow } from "@/types/adminQuestion";

type SourceKind = "bluebooky" | "satgpt";
type QuestionType = "multiple_choice" | "spr";
type AiProvider = "codex" | "gemini";

type RawCsvRow = Record<string, string | undefined>;

type ParsedCsvRow = {
  row: RawCsvRow;
  sourceRowNumber: number;
  rawRecord: string;
  warnings: string[];
};

type ConversionError = {
  source: SourceKind;
  sourceFile: string;
  csvRowNumber?: number;
  severity: "error" | "warning";
  code: string;
  message: string;
  rawRecord?: string;
  row?: RawCsvRow;
  details?: unknown;
};

type SourceDataError = {
  id: string;
  source: SourceKind;
  sourceFile: string;
  csvRowNumber: number;
  issue: string;
  message: string;
  row: ConvertedQuestion["row"];
  promptContext: ConvertedQuestion["promptContext"];
  payloadHints: GeminiDebugEntry["payloadHints"];
};

type ConvertedQuestion = {
  id: string;
  source: SourceKind;
  sourceFile: string;
  csvRowNumber: number;
  answerCacheKey: string;
  row: AdminQuestionUploadRow;
  issues: string[];
  skipped: boolean;
  skipReason?: string;
  promptContext: {
    imageUrls: string[];
    extraPlainText: string;
    extraTableCsv: string;
    extraSvg: string;
  };
};

type GeminiAnswer = {
  id: string;
  cacheKey?: string;
  section?: string;
  domain?: string;
  skill?: string;
  answerLetter?: string;
  answer?: string;
  sprAnswers?: string[];
  confidence?: number;
  needsReview?: boolean;
  reason?: string;
};

type GeminiDebugEntry = {
  type: "api_attempt" | "malformed_json" | "needs_review" | "invalid_answer";
  batchIds?: string[];
  itemId?: string;
  cacheKey?: string;
  attempt?: number;
  status?: number | null;
  reason?: string;
  answer?: GeminiAnswer;
  stdoutPreview?: string;
  stderrPreview?: string;
  payloadHints?: {
    hasChoices: boolean;
    hasImageUrl: boolean;
    imageUrlCount: number;
    hasExtraTableCsv: boolean;
    hasExtraSvg: boolean;
    hasVizMarker: boolean;
    questionTextLength: number;
    passageLength: number;
  };
};

type RunSummary = {
  aiProvider: AiProvider;
  aiModel: string;
  sources: Record<SourceKind, number>;
  rowsRead: number;
  parseErrors: number;
  skipped: number;
  ready: number;
  needsReview: number;
  geminiCandidates: number;
  geminiSkippedSourceErrors: number;
  geminiAnswered: number;
  geminiClassified: number;
  geminiNeedsReview: number;
  issues: Record<string, number>;
};

const defaultBluebookyDir = "C:\\Users\\MHC\\Desktop\\sat-question-finetuning\\bluebooky-scraper\\data";
const defaultSatgptDir = "C:\\Users\\MHC\\Desktop\\sat-question-finetuning\\sat-suite-question-bank-scraper\\data\\satgpt";
const defaultOutputDir = "C:\\Users\\MHC\\Desktop\\sat-question-finetuning\\converted-admin-json";
const imageMarkerPattern = /\[IMG:([^\]\s]+)\]/gi;
const htmlAlignmentPattern = /<(?:svg|path|math|div|table|tr|td|th|span|annotation)\b|<\/|class=/i;
const recordNewlineSentinel = "\uE000";

const sourceHeaders: Record<SourceKind, string[]> = {
  bluebooky: [
    "exam_name",
    "module_number",
    "question_number",
    "total_in_module",
    "passage",
    "has_image",
    "svg_data",
    "question",
    "answer_A",
    "answer_B",
    "answer_C",
    "answer_D",
    "correct_answer",
  ],
  satgpt: [
    "exam_name",
    "region",
    "form",
    "module",
    "question_number",
    "total_in_module",
    "passage",
    "has_image",
    "image_urls",
    "question",
    "answer_A",
    "answer_B",
    "answer_C",
    "answer_D",
    "correct_answer",
  ],
};

const optionalSatgptSvgHeaders = [
  "exam_name",
  "region",
  "form",
  "module",
  "question_number",
  "total_in_module",
  "passage",
  "has_image",
  "image_urls",
  "svg_data",
  "question",
  "answer_A",
  "answer_B",
  "answer_C",
  "answer_D",
  "correct_answer",
];

const sectionTaxonomy = {
  "Reading and Writing": {
    "Information and Ideas": ["Central Ideas and Details", "Inferences", "Command of Evidence"],
    "Craft and Structure": ["Words in Context", "Text Structure and Purpose", "Cross-Text Connections"],
    "Expression of Ideas": ["Rhetorical Synthesis", "Transitions"],
    "Standard English Conventions": ["Boundaries", "Form, Structure, and Sense"],
  },
  Math: {
    Algebra: [
      "Linear equations in one variable",
      "Linear functions",
      "Linear equations in two variables",
      "Systems of two linear equations in two variables",
      "Linear inequalities in one or two variables",
    ],
    "Advanced Math": [
      "Nonlinear functions",
      "Nonlinear equations in one variable and systems of equations in two variables",
      "Equivalent expressions",
    ],
    "Problem-Solving and Data Analysis": [
      "Ratios, rates, proportional relationships, and units",
      "Percentages",
      "One-variable data: Distributions and measures of center and spread",
      "Two-variable data: Models and scatterplots",
      "Probability and conditional probability",
      "Inference from sample statistics and margin of error",
      "Evaluating statistical claims: Observational studies and experiments",
    ],
    "Geometry and Trigonometry": ["Area and volume", "Lines, angles, and triangles", "Right triangles and trigonometry", "Circles"],
  },
} as const;

type TaxonomySection = keyof typeof sectionTaxonomy;

function isTaxonomySection(value: string): value is TaxonomySection {
  return value === "Reading and Writing" || value === "Math";
}

function isValidTaxonomy(section: string, domain: string, skill: string) {
  if (!isTaxonomySection(section)) {
    return false;
  }

  const sectionDomains = sectionTaxonomy[section] as Record<string, readonly string[]>;
  return Boolean(sectionDomains[domain]?.includes(skill));
}

function taxonomyPromptText() {
  return JSON.stringify(sectionTaxonomy, null, 2);
}

const numericStringSchema = z.string().trim().regex(/^\d+(?:\.0+)?$/, "Expected a numeric string");
const bluebookyRowSchema = z.object({
  exam_name: z.string().trim().min(1),
  module_number: numericStringSchema,
  question_number: numericStringSchema,
  total_in_module: z.string().optional(),
  passage: z.string().optional(),
  has_image: z.string().optional(),
  svg_data: z.string().optional(),
  question: z.string().optional(),
  answer_A: z.string().optional(),
  answer_B: z.string().optional(),
  answer_C: z.string().optional(),
  answer_D: z.string().optional(),
  correct_answer: z.string().optional(),
});
const satgptRowSchema = z.object({
  exam_name: z.string().trim().min(1),
  region: z.string().optional(),
  form: z.string().optional(),
  module: z.string().trim().regex(/^Module\s+\d+:\s+(?:Reading and Writing|Math)$/i, "Expected a SAT module label"),
  question_number: numericStringSchema,
  total_in_module: z.string().optional(),
  passage: z.string().optional(),
  has_image: z.string().optional(),
  image_urls: z.string().optional(),
  question: z.string().optional(),
  answer_A: z.string().optional(),
  answer_B: z.string().optional(),
  answer_C: z.string().optional(),
  answer_D: z.string().optional(),
  correct_answer: z.string().optional(),
});
const geminiAnswerSchema = z.object({
  id: z.string().min(1),
  cacheKey: z.string().optional(),
  section: z.string().optional(),
  domain: z.string().optional(),
  skill: z.string().optional(),
  answerLetter: z.string().optional(),
  answer: z.string().optional(),
  sprAnswers: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  needsReview: z.boolean().optional(),
  reason: z.string().optional(),
});
const geminiAnswerArraySchema = z.array(geminiAnswerSchema);

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split("=");
      return [key, rest.length > 0 ? rest.join("=") : "true"];
    }),
);

const sourceFilter = (args.get("source") ?? "all") as SourceKind | "all";
const bluebookyDir = args.get("bluebooky-dir") ?? defaultBluebookyDir;
const satgptDir = args.get("satgpt-dir") ?? defaultSatgptDir;
const outputDir = args.get("out") ?? defaultOutputDir;
const shouldFillMissingAnswers = args.get("fill-missing-answers") === "true";
const shouldClassifyMetadata = args.get("classify-metadata") === "true" || shouldFillMissingAnswers;
const shouldApplyCacheOnly = args.get("apply-cache-only") === "true";
const shouldContinueOnAiError = args.get("continue-on-ai-error") === "true";
const geminiBatchSize = Number.parseInt(args.get("ai-batch") ?? args.get("gemini-batch") ?? "12", 10);
const geminiLimit = Number.parseInt(args.get("ai-limit") ?? args.get("gemini-limit") ?? "0", 10);
const aiNewLimit = Number.parseInt(args.get("ai-new-limit") ?? "0", 10);
const aiProvider = ((args.get("ai-provider") ?? "codex").toLowerCase() === "gemini" ? "gemini" : "codex") as AiProvider;
const geminiModel = args.get("gemini-model") ?? "gemini-2.5-pro";
const codexModel = args.get("codex-model") ?? args.get("ai-model") ?? "gpt-5.2";
const codexHome = args.get("codex-home") ?? process.env.CODEX_HOME ?? "C:\\Users\\MHC\\.codex-gatecheap";
const codexBin = args.get("codex-bin") ?? process.env.CODEX_BIN ?? "C:\\nvm4w\\nodejs\\codex.cmd";
const aiModel = aiProvider === "codex" ? `${codexModel}; CODEX_HOME=${codexHome}` : geminiModel;
const answerCacheFileName = aiProvider === "codex" ? "codex-answer-cache.json" : "gemini-answer-cache.json";
const geminiDebugLog: GeminiDebugEntry[] = [];

function getCell(row: RawCsvRow, key: string) {
  return normalizeText(row[key] ?? "");
}

function normalizeText(value: string) {
  return value
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function shouldConvertDollarMath(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }

  if (/\b(?:dollar|dollars|usd|cost|price|paid|pay|spent|revenue|profit|fee|fees)\b/i.test(trimmed)) {
    return false;
  }

  if (!/\\[a-zA-Z]+|[=<>^_{}]|≤|≥|√|π|θ|∠|△/.test(trimmed) && /\b[a-z]{3,}\b/i.test(trimmed)) {
    return false;
  }

  if (/^(?:\\[a-zA-Z]+|[A-Za-z]\w*(?:\s*[=+\-*/^<>]\s*|\(|\[)|\d+(?:\.\d+)?(?:\s*[=+\-*/^<>]\s*|\s*,|\s*$)|[()[\]{}=+\-*/^<>]|\\frac|\\sqrt)/.test(trimmed)) {
    return true;
  }

  return /[=+\-*/^_{}\\]|\\(?:frac|sqrt|text|left|right|pi|theta|angle|triangle)|\b(?:sin|cos|tan|log)\b/.test(trimmed);
}

function looksLikeBareMath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /\\\(|\\\[|<img|<table|<svg/i.test(trimmed)) {
    return false;
  }

  if (/\s{2,}/.test(trimmed) || trimmed.length > 80 || /[.!?;:"“”]/.test(trimmed)) {
    return false;
  }

  if (/[a-z]{3,}\s+[a-z]{3,}/i.test(trimmed)) {
    return false;
  }

  return (
    /^(?:[a-zA-Z]\w*|[xyabcrstmnkpqfgh]\([^)]*\)|[A-Z]\([^)]*\))\s*=/.test(trimmed)
    || /^[xy]\s*[<>=]/i.test(trimmed)
    || /^[+-]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/.test(trimmed)
    || /^[+-]?\d+(?:\.\d+)?\s*(?:[+*/^]|-\s*)\s*[A-Za-z0-9(]/.test(trimmed)
    || /[A-Za-z0-9)]\s*(?:=|≤|≥|<|>)\s*[A-Za-z0-9(]/.test(trimmed)
    || /\b[A-Za-z]\s*\^\s*\d+\b/.test(trimmed)
    || /(?:√|π|θ|°|²|³|⁄|−|≤|≥|∠|△)/.test(trimmed)
    || /\b(?:sin|cos|tan|log)\s*\(/i.test(trimmed)
  );
}

function wrapStandaloneBareMathLines(value: string) {
  const htmlPlaceholders: string[] = [];
  let protectedValue = value.replace(/<[^>]+>/g, (match) => {
    htmlPlaceholders.push(match);
    return `\uE100${htmlPlaceholders.length - 1}\uE101`;
  });

  protectedValue = protectedValue
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!looksLikeBareMath(trimmed)) {
        return line;
      }

      const leading = line.match(/^\s*/)?.[0] ?? "";
      const trailing = line.match(/\s*$/)?.[0] ?? "";
      return `${leading}\\(${trimmed}\\)${trailing}`;
    })
    .join("\n");

  protectedValue = protectedValue.replace(/\uE100(\d+)\uE101/g, (_, index: string) => htmlPlaceholders[Number(index)] ?? "");
  return protectedValue;
}

function normalizeLatexDelimiters(value: string) {
  let normalized = value.replace(/\\\[((?:.|\n)*?)\\\]/g, (_, content: string) => `\\(${content.trim()}\\)`);
  normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (_, content: string) => `\\(${content.trim()}\\)`);
  normalized = normalized.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (match: string, prefix: string, content: string) => {
    return shouldConvertDollarMath(content) ? `${prefix}\\(${content.trim()}\\)` : match;
  });
  return wrapStandaloneBareMathLines(normalized);
}

function normalizeContentForJson(value: string) {
  return normalizeScrapedMarkdownHtml(normalizeLatexDelimiters(normalizeText(value)));
}

function writeJsonAtomic(filePath: string, value: unknown) {
  const partialPath = `${filePath}.partial`;
  writeFileSync(partialPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(partialPath, filePath);
}

function writeTextAtomic(filePath: string, value: string) {
  const partialPath = `${filePath}.partial`;
  writeFileSync(partialPath, value, "utf8");
  renameSync(partialPath, filePath);
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRateLimitOutput(value: string) {
  return /quota|rate limit|resource exhausted|too many requests|429/i.test(value);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function cleanPlainText(value: string) {
  return value
    .replace(/\b([A-Za-z0-9]+)\s+\$\1\$\s+\1\b/g, "$$$1$")
    .replace(/\b([A-Za-z0-9]+)\s+\$\\text\{\1\}\$\s+\1\b/g, "$$$1$")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToPlainText(html: string) {
  const withLatex = html.replace(/<annotation[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/gi, (_, tex: string) => {
    return ` $${decodeHtmlEntities(tex).trim()}$ `;
  });

  return cleanPlainText(decodeHtmlEntities(
    withLatex
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|tr|table|thead|tbody|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  ));
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function extractTableExtra(html: string) {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    return null;
  }

  const tableHtml = tableMatch[0];
  const rowMatches = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
  const tableRows = rowMatches
    .map((rowHtml) => {
      const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((match) => htmlToPlainText(match[1]))
        .map((cell) => cell.replace(/\s+/g, " ").trim());
      return cells;
    })
    .filter((cells) => cells.length > 0 && cells.some(Boolean));

  if (tableRows.length === 0) {
    return null;
  }

  const beforeTable = htmlToPlainText(html.slice(0, tableMatch.index ?? 0));
  const content = tableRows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return {
    extra: {
      type: "table",
      content: {
        title: beforeTable || undefined,
        content,
      },
    },
    plainText: [beforeTable, tableRows.map((row) => row.join(" | ")).join("\n")].filter(Boolean).join("\n"),
  };
}

function extractSvgExtra(html: string) {
  const svgMatch = html.match(/<svg[\s\S]*?<\/svg>/i);
  if (!svgMatch) {
    return null;
  }

  return {
    extra: {
      type: "figure_math",
      content: {
        svg: svgMatch[0].trim(),
      },
    },
    plainText: htmlToPlainText(svgMatch[0]),
  };
}

function buildExtraFromHtml(html: string) {
  const normalized = normalizeText(html);
  if (!normalized) {
    return { extra: undefined, plainText: "" };
  }

  const table = extractTableExtra(normalized);
  if (table) {
    return table;
  }

  const svg = extractSvgExtra(normalized);
  if (svg) {
    return svg;
  }

  return {
    extra: undefined,
    plainText: htmlToPlainText(normalized),
  };
}

function getExtraTableCsv(extra: unknown) {
  if (!extra || typeof extra !== "object") {
    return "";
  }

  const candidate = extra as { type?: unknown; content?: unknown };
  if (candidate.type !== "table" || !candidate.content || typeof candidate.content !== "object") {
    return "";
  }

  const content = candidate.content as { content?: unknown };
  return typeof content.content === "string" ? content.content : "";
}

function getExtraSvg(extra: unknown) {
  if (!extra || typeof extra !== "object") {
    return "";
  }

  const candidate = extra as { type?: unknown; content?: unknown };
  if (candidate.type === "table" || !candidate.content || typeof candidate.content !== "object") {
    return "";
  }

  const content = candidate.content as { svg?: unknown };
  return typeof content.svg === "string" ? content.svg : "";
}

function parseImageUrls(...values: string[]) {
  const urls = new Set<string>();

  for (const value of values) {
    for (const part of normalizeText(value).split("|")) {
      const trimmed = part.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        urls.add(trimmed);
      }
    }

    for (const match of value.matchAll(imageMarkerPattern)) {
      urls.add(match[1].trim());
    }
  }

  return [...urls];
}

function replaceImageMarkers(value: string, mode: "remove" | "img") {
  return normalizeText(value).replace(imageMarkerPattern, (_, url: string) => {
    return mode === "img" ? `<img src="${url}" alt="" />` : "";
  }).trim();
}

function normalizeAnswerChoice(value: string) {
  const cleaned = replaceImageMarkers(value, "img");
  return normalizeContentForJson(cleaned.replace(/\s+/g, " ").trim());
}

function canonicalizeContentForAnswerCache(value: string) {
  return normalizeText(value)
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<u>([\s\S]*?)<\/u>/gi, "__$1__")
    .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<[^>]+>/g, "");
}

function getAnswerCacheKey(row: AdminQuestionUploadRow, context: ConvertedQuestion["promptContext"]) {
  return createHash("sha1")
    .update(JSON.stringify({
      section: row.section,
      questionType: row.questionType,
      passage: canonicalizeContentForAnswerCache(row.passage ?? ""),
      questionText: canonicalizeContentForAnswerCache(row.questionText ?? ""),
      choices: [row.choice_0, row.choice_1, row.choice_2, row.choice_3].map((choice) => canonicalizeContentForAnswerCache(choice ?? "")),
      imageUrl: normalizeText(row.imageUrl ?? ""),
      imageUrls: context.imageUrls,
      extraPlainText: normalizeText(context.extraPlainText),
      extraTableCsv: normalizeText(context.extraTableCsv),
      extraSvgHash: context.extraSvg ? createHash("sha1").update(context.extraSvg).digest("hex") : "",
    }))
    .digest("hex");
}

function isAdOrInstruction(row: RawCsvRow) {
  const question = getCell(row, "question");
  const passage = getCell(row, "passage");

  if (/free sat exam seat/i.test(question) && /unique link/i.test(passage)) {
    return "ad_row";
  }

  if (/^student-produced response directions$/i.test(question)) {
    return "student_produced_response_instruction";
  }

  if (/^section\s+\d+:/i.test(question)) {
    return "section_header";
  }

  return null;
}

function inferBluebookySection(fileName: string, examName: string) {
  const marker = `${fileName} ${examName}`.toLowerCase();
  return marker.includes("_math_") || marker.includes("math test") ? "Math" : "Reading and Writing";
}

function inferSatgptSection(moduleName: string, examName: string, fileName: string) {
  const marker = `${moduleName} ${examName} ${fileName}`.toLowerCase();
  return marker.includes("math") ? "Math" : "Reading and Writing";
}

function parseModuleNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function getChoiceCode(index: number) {
  return `choice_${index}`;
}

function mapCorrectAnswer(rawAnswer: string, choices: string[]) {
  const answer = normalizeText(rawAnswer);
  if (!answer) {
    return "";
  }

  const letterIndex = ["A", "B", "C", "D"].indexOf(answer.toUpperCase());
  if (letterIndex >= 0) {
    return choices[letterIndex] ? getChoiceCode(letterIndex) : "";
  }

  const exactChoiceIndex = choices.findIndex((choice) => choice === normalizeContentForJson(answer));
  return exactChoiceIndex >= 0 ? getChoiceCode(exactChoiceIndex) : answer;
}

function buildBaseRow(params: {
  section: string;
  module: number;
  questionType: QuestionType;
  questionText: string;
  passage: string;
  imageUrl: string;
  choices: string[];
  correctAnswer: string;
  sprAnswers: string[];
  extra: unknown;
}) {
  const row: ConvertedQuestion["row"] = {
    section: params.section,
    domain: "",
    skill: "",
    module: params.module,
    questionType: params.questionType,
    questionText: normalizeContentForJson(params.questionText),
    explanation: "No explanation available.",
    difficulty: "medium",
    points: 10,
    passage: normalizeContentForJson(params.passage),
    imageUrl: params.imageUrl,
  };

  if (params.extra !== undefined) {
    row.extra = params.extra;
  }

  if (params.questionType === "multiple_choice") {
    row.choice_0 = params.choices[0] ?? "";
    row.choice_1 = params.choices[1] ?? "";
    row.choice_2 = params.choices[2] ?? "";
    row.choice_3 = params.choices[3] ?? "";
    row.correctAnswer = params.correctAnswer;
    row.sprAnswers = [];
  } else {
    row.sprAnswers = params.sprAnswers.map(normalizeContentForJson);
    row.sprAnswer_0 = row.sprAnswers[0] ?? "";
    row.sprAnswer_1 = row.sprAnswers[1] ?? "";
    row.sprAnswer_2 = row.sprAnswers[2] ?? "";
  }

  return row;
}

function convertBluebookyRow(fileName: string, row: RawCsvRow, sourceRowNumber: number): ConvertedQuestion {
  const skippedReason = isAdOrInstruction(row);
  const id = `bluebooky:${fileName}:${sourceRowNumber}`;
  const choices = ["answer_A", "answer_B", "answer_C", "answer_D"].map((key) => normalizeAnswerChoice(getCell(row, key))).filter(Boolean);
  const svgData = getCell(row, "svg_data");
  const extraResult = buildExtraFromHtml(svgData);
  const plainQuestion = getCell(row, "question") || extraResult.plainText;
  const passageParts = [getCell(row, "passage")];

  if (!getCell(row, "passage") && extraResult.plainText && extraResult.extra === undefined) {
    passageParts.push(extraResult.plainText);
  }

  const questionType: QuestionType = choices.length > 0 ? "multiple_choice" : "spr";
  const correctAnswer = questionType === "multiple_choice" ? mapCorrectAnswer(getCell(row, "correct_answer"), choices) : "";
  const sprAnswers = questionType === "spr" && getCell(row, "correct_answer") ? [getCell(row, "correct_answer")] : [];
  const promptContext = {
    imageUrls: [],
    extraPlainText: extraResult.plainText,
    extraTableCsv: getExtraTableCsv(extraResult.extra),
    extraSvg: getExtraSvg(extraResult.extra),
  };
  const convertedRow = buildBaseRow({
    section: inferBluebookySection(fileName, getCell(row, "exam_name")),
    module: parseModuleNumber(getCell(row, "module_number")),
    questionType,
    questionText: plainQuestion,
    passage: passageParts.filter(Boolean).join("\n\n"),
    imageUrl: "",
    choices,
    correctAnswer,
    sprAnswers,
    extra: extraResult.extra,
  });

  return {
    id,
    source: "bluebooky",
    sourceFile: fileName,
    csvRowNumber: sourceRowNumber,
    answerCacheKey: getAnswerCacheKey(convertedRow, promptContext),
    row: convertedRow,
    issues: [],
    skipped: Boolean(skippedReason),
    skipReason: skippedReason ?? undefined,
    promptContext,
  };
}

function convertSatgptRow(fileName: string, row: RawCsvRow, sourceRowNumber: number): ConvertedQuestion {
  const id = `satgpt:${fileName}:${sourceRowNumber}`;
  const rawChoices = ["answer_A", "answer_B", "answer_C", "answer_D"].map((key) => getCell(row, key));
  const choices = rawChoices.map(normalizeAnswerChoice).filter(Boolean);
  const allChoicesAreImages = choices.length > 0 && choices.every((choice) => /^<img src=/.test(choice));
  const questionImageUrls = parseImageUrls(getCell(row, "question"));
  const passageImageUrls = parseImageUrls(getCell(row, "passage"));
  const declaredImageUrls = parseImageUrls(getCell(row, "image_urls"));
  const imageUrls = [...new Set([...questionImageUrls, ...passageImageUrls, ...declaredImageUrls])];
  const extraResult = buildExtraFromHtml(getCell(row, "svg_data"));
  const imageUrl = allChoicesAreImages ? "" : (questionImageUrls[0] ?? passageImageUrls[0] ?? declaredImageUrls[0] ?? "");
  const section = inferSatgptSection(getCell(row, "module"), getCell(row, "exam_name"), fileName);
  const questionType: QuestionType = choices.length > 0 ? "multiple_choice" : "spr";
  const questionText = replaceImageMarkers(getCell(row, "question"), "remove");
  let passage = replaceImageMarkers(getCell(row, "passage"), "remove");

  if (section === "Math" && passage && questionText && passage.replace(/\s+/g, " ").includes(questionText.replace(/\s+/g, " ").slice(0, 80))) {
    passage = "";
  }

  const correctAnswer = questionType === "multiple_choice" ? mapCorrectAnswer(getCell(row, "correct_answer"), choices) : "";
  const sprAnswers = questionType === "spr" && getCell(row, "correct_answer") ? [getCell(row, "correct_answer")] : [];
  const promptContext = {
    imageUrls,
    extraPlainText: extraResult.plainText,
    extraTableCsv: getExtraTableCsv(extraResult.extra),
    extraSvg: getExtraSvg(extraResult.extra),
  };
  const convertedRow = buildBaseRow({
    section,
    module: parseModuleNumber(getCell(row, "module")),
    questionType,
    questionText,
    passage,
    imageUrl,
    choices,
    correctAnswer,
    sprAnswers,
    extra: extraResult.extra,
  });

  return {
    id,
    source: "satgpt",
    sourceFile: fileName,
    csvRowNumber: sourceRowNumber,
    answerCacheKey: getAnswerCacheKey(convertedRow, promptContext),
    row: convertedRow,
    issues: [],
    skipped: false,
    promptContext,
  };
}

function collectIssues(item: ConvertedQuestion) {
  if (item.skipped) {
    return;
  }

  const issues = item.issues;
  const questionText = normalizeText(item.row.questionText ?? "");
  const type = item.row.questionType;

  if (!questionText) {
    issues.push("missing_question_text");
  }

  if (!isValidTaxonomy(normalizeText(item.row.section ?? ""), normalizeText(item.row.domain ?? ""), normalizeText(item.row.skill ?? ""))) {
    issues.push("missing_or_invalid_taxonomy");
  }

  if (type === "multiple_choice") {
    const choices = [item.row.choice_0, item.row.choice_1, item.row.choice_2, item.row.choice_3].map((choice) => normalizeText(choice ?? "")).filter(Boolean);
    const correctAnswer = normalizeText(item.row.correctAnswer ?? "");
    if (choices.length < 2) {
      issues.push("multiple_choice_less_than_two_choices");
    }
    if (!correctAnswer) {
      issues.push("missing_correct_answer");
    } else if (!/^choice_[0-3]$/.test(correctAnswer)) {
      issues.push("correct_answer_does_not_match_choice");
    }
  }

  if (type === "spr" && (!Array.isArray(item.row.sprAnswers) || item.row.sprAnswers.length === 0)) {
    issues.push("missing_spr_answer");
  }
}

function isRecordStart(source: SourceKind, line: string) {
  const trimmed = line.trimStart().replace(/^\uFEFF/u, "");
  if (!trimmed) {
    return false;
  }

  if (source === "bluebooky") {
    return /^"?[^,"\n]*(?:RW|MATH)\s+TEST[^,"\n]*"?\s*,\s*"?\d+"?\s*,\s*"?\d+(?:\.0+)?"?\s*,/i.test(trimmed);
  }

  return /^"?[^,"\n]*\d{4}[^,"\n]*"?\s*,\s*"?[^,"\n]*"?\s*,\s*"?[^,"\n]*"?\s*,\s*"?Module\s+\d+:\s*(?:Reading and Writing|Math)"?\s*,\s*"?\d+(?:\.0+)?"?\s*,/i.test(trimmed);
}

function splitCsvRecords(source: SourceKind, raw: string, fileName: string, errors: ConversionError[]) {
  const normalized = raw.replace(/^\uFEFF/u, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const [headerLine = "", ...lines] = normalized.split("\n");
  const records: Array<{ rawRecord: string; sourceRowNumber: number }> = [];
  let current = "";
  let currentStartLine = 2;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      if (current) {
        current += "\n";
      }
      continue;
    }

    if (isRecordStart(source, line)) {
      if (current.trim()) {
        records.push({ rawRecord: current, sourceRowNumber: currentStartLine });
      }
      current = line;
      currentStartLine = index + 2;
      continue;
    }

    if (!current) {
      errors.push({
        source,
        sourceFile: fileName,
        csvRowNumber: index + 2,
        severity: "error",
        code: "orphan_multiline_fragment",
        message: "Physical line does not look like a record start and there is no previous record to attach it to.",
        rawRecord: line,
      });
      continue;
    }

    current += `\n${line}`;
  }

  if (current.trim()) {
    records.push({ rawRecord: current, sourceRowNumber: currentStartLine });
  }

  return {
    headerLine,
    records,
  };
}

function parseRecordFields(source: SourceKind, rawRecord: string, expectedHeaders: string[]) {
  const recordForPapa = rawRecord.replace(/\n/g, recordNewlineSentinel);
  const parsed = Papa.parse<string[]>(recordForPapa, {
    header: false,
    skipEmptyLines: false,
    quoteChar: '"',
    escapeChar: '"',
  });
  const rawFields = (parsed.data[0] ?? []).map((field) => String(field ?? "").replaceAll(recordNewlineSentinel, "\n"));
  const warnings: string[] = [];

  if (parsed.errors.length > 0) {
    warnings.push(...parsed.errors.map((error) => `papaparse_${error.code}`));
  }

  if (rawFields.length === expectedHeaders.length) {
    return {
      fields: rawFields,
      warnings,
    };
  }

  if (rawFields.length > expectedHeaders.length) {
    warnings.push(`repaired_extra_columns_${rawFields.length}_to_${expectedHeaders.length}`);
    if (source === "bluebooky") {
      return {
        fields: [...rawFields.slice(0, 6), rawFields.slice(6, -6).join(","), ...rawFields.slice(-6)],
        warnings,
      };
    }

    return {
      fields: [...rawFields.slice(0, 6), rawFields.slice(6, -8).join(","), ...rawFields.slice(-8)],
      warnings,
    };
  }

  return {
    fields: rawFields,
    warnings: [...warnings, `too_few_columns_${rawFields.length}_expected_${expectedHeaders.length}`],
  };
}

function validateParsedRow(source: SourceKind, row: RawCsvRow) {
  const schema = source === "bluebooky" ? bluebookyRowSchema : satgptRowSchema;
  const result = schema.safeParse(row);
  const issues = result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  const shortColumns = source === "bluebooky"
    ? ["exam_name", "module_number", "question_number", "total_in_module", "has_image", "correct_answer"]
    : ["exam_name", "region", "form", "module", "question_number", "total_in_module", "has_image", "correct_answer"];

  for (const key of shortColumns) {
    const value = row[key] ?? "";
    if (htmlAlignmentPattern.test(value)) {
      issues.push(`${key}: raw HTML/SVG detected in a short metadata column; likely CSV alignment corruption`);
    }
  }

  return issues;
}

function getExpectedHeaders(source: SourceKind, parsedHeader: string[]) {
  if (source === "satgpt" && parsedHeader.join("|") === optionalSatgptSvgHeaders.join("|")) {
    return optionalSatgptSvgHeaders;
  }

  return sourceHeaders[source];
}

function readCsv(source: SourceKind, filePath: string, errors: ConversionError[]) {
  const raw = readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);
  const { headerLine, records } = splitCsvRecords(source, raw, fileName, errors);
  const parsedHeader = Papa.parse<string[]>(headerLine, { header: false }).data[0] ?? [];
  const normalizedHeader = parsedHeader.map((header) => String(header ?? "").trim());
  const expectedHeaders = getExpectedHeaders(source, normalizedHeader);

  if (normalizedHeader.join("|") !== expectedHeaders.join("|")) {
    errors.push({
      source,
      sourceFile: fileName,
      severity: "error",
      code: "unexpected_header",
      message: `Unexpected CSV header. Expected ${expectedHeaders.join(",")}.`,
      rawRecord: headerLine,
      details: {
        parsedHeader: normalizedHeader,
      },
    });
    return [];
  }

  const rows: ParsedCsvRow[] = [];
  for (const record of records) {
    const parsed = parseRecordFields(source, record.rawRecord, expectedHeaders);
    if (parsed.fields.length !== expectedHeaders.length) {
      errors.push({
        source,
        sourceFile: fileName,
        csvRowNumber: record.sourceRowNumber,
        severity: "error",
        code: "unrecoverable_column_count",
        message: `Could not recover record column count. Parsed ${parsed.fields.length}, expected ${expectedHeaders.length}.`,
        rawRecord: record.rawRecord,
        details: {
          warnings: parsed.warnings,
          fields: parsed.fields,
        },
      });
      continue;
    }

    const row = Object.fromEntries(expectedHeaders.map((header, index) => [header, parsed.fields[index] ?? ""])) as RawCsvRow;
    const rowIssues = validateParsedRow(source, row);
    if (rowIssues.length > 0) {
      errors.push({
        source,
        sourceFile: fileName,
        csvRowNumber: record.sourceRowNumber,
        severity: "error",
        code: "row_schema_validation_failed",
        message: "Parsed row failed source schema validation.",
        rawRecord: record.rawRecord,
        row,
        details: rowIssues,
      });
      continue;
    }

    for (const warning of parsed.warnings) {
      errors.push({
        source,
        sourceFile: fileName,
        csvRowNumber: record.sourceRowNumber,
        severity: "warning",
        code: warning,
        message: "CSV record required parser repair or emitted a parser warning.",
        row,
      });
    }

    rows.push({
      row,
      sourceRowNumber: record.sourceRowNumber,
      rawRecord: record.rawRecord,
      warnings: parsed.warnings,
    });
  }

  return rows;
}

function getCsvFiles(source: SourceKind) {
  const root = source === "bluebooky" ? bluebookyDir : satgptDir;
  return readdirSync(root)
    .filter((fileName) => fileName.toLowerCase().endsWith(".csv"))
    .sort()
    .map((fileName) => ({
      source,
      fileName,
      filePath: path.join(root, fileName),
    }));
}

function slugFromFile(fileName: string) {
  return fileName.replace(/\.csv$/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function loadGeminiCache(cachePath: string) {
  if (!existsSync(cachePath)) {
    return new Map<string, GeminiAnswer>();
  }

  const rawText = readFileSync(cachePath, "utf8").replace(/^\uFEFF/u, "");
  if (!rawText.trim()) {
    return new Map<string, GeminiAnswer>();
  }

  const raw = JSON.parse(rawText) as GeminiAnswer[];
  const cache = new Map<string, GeminiAnswer>();
  for (const answer of raw) {
    cache.set(answer.cacheKey ?? answer.id, answer);
    cache.set(answer.id, answer);
  }
  return cache;
}

function saveGeminiCache(cachePath: string, cache: Map<string, GeminiAnswer>) {
  const deduped = new Map<string, GeminiAnswer>();
  for (const answer of cache.values()) {
    if (!answer.id && !answer.cacheKey) {
      continue;
    }

    const key = `${answer.id || ""}\u0000${answer.cacheKey || ""}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, answer);
      continue;
    }

    const existingUsable = !existing.needsReview && Boolean(existing.answerLetter || existing.answer || existing.sprAnswers?.length);
    const nextUsable = !answer.needsReview && Boolean(answer.answerLetter || answer.answer || answer.sprAnswers?.length);
    if ((nextUsable && !existingUsable) || ((answer.confidence ?? 0) > (existing.confidence ?? 0))) {
      deduped.set(key, answer);
    }
  }

  writeJsonAtomic(
    cachePath,
    [...deduped.values()].sort((left, right) =>
      (left.id || left.cacheKey || "").localeCompare(right.id || right.cacheKey || "")
      || (left.cacheKey || "").localeCompare(right.cacheKey || "")
    ),
  );
}

function buildGeminiPrompt(batch: ConvertedQuestion[]) {
  const payload = batch.map((item) => {
    const row = item.row;
    return {
      id: item.id,
      cacheKey: item.answerCacheKey,
      currentSection: row.section,
      module: row.module,
      questionType: row.questionType,
      passage: row.passage,
      questionText: row.questionText,
      choices: [row.choice_0, row.choice_1, row.choice_2, row.choice_3].filter(Boolean),
      imageUrl: row.imageUrl,
      imageUrls: item.promptContext.imageUrls,
      extraPlainText: item.promptContext.extraPlainText,
      extraTableCsv: item.promptContext.extraTableCsv,
      extraSvg: item.promptContext.extraSvg ? item.promptContext.extraSvg.slice(0, 12000) : "",
    };
  });

  return [
    "Solve these SAT questions and return a raw JSON array only. No markdown fences, no prose, no comments.",
    "For every item, classify section, domain, and skill using ONLY this taxonomy. Return exact strings from this taxonomy.",
    taxonomyPromptText(),
    "For multiple_choice questions, return answerLetter as A, B, C, or D. For spr questions, return answer as the exact accepted numeric/string answer.",
    "For SPR questions, also return sprAnswers as an array of all reasonable accepted answer variants, for example [\"1/3\", \".333\", \"0.333\"].",
    "Use all provided context: passage, questionText, choices, extraTableCsv, extraPlainText, extraSvg, imageUrl, and imageUrls.",
    "A {viz} marker means a visual existed in the original source; if extraTableCsv, extraPlainText, extraSvg, imageUrl, or the answer choices contain enough information, solve it anyway.",
    "For SVG geometry/graphs, read labels, coordinates, paths, lines, text, and shapes from extraSvg when possible.",
    "Set needsReview true only when the answer is genuinely impossible from all provided context. If you can identify the best answer, set needsReview false even if confidence is below 1.",
    "Echo each input id and cacheKey exactly. Use this exact shape: [{\"id\":\"...\",\"cacheKey\":\"...\",\"section\":\"Math\",\"domain\":\"Algebra\",\"skill\":\"Linear equations in one variable\",\"answerLetter\":\"A\",\"answer\":\"\",\"sprAnswers\":[],\"confidence\":0.9,\"needsReview\":false,\"reason\":\"short\"}]",
    JSON.stringify(payload),
  ].join("\n\n");
}

function parseGeminiJson(output: string): GeminiAnswer[] {
  const cleaned = output
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const candidates = [cleaned];
  const first = cleaned.indexOf("[");
  const last = cleaned.lastIndexOf("]");

  if (first >= 0 && last > first) {
    candidates.push(cleaned.slice(first, last + 1));
  }

  for (const candidate of candidates) {
    try {
      return geminiAnswerArraySchema.parse(JSON.parse(candidate));
    } catch {
      // Try the next fallback shape before surfacing the malformed response.
    }
  }

  throw new Error(`Gemini returned malformed JSON: ${output.slice(0, 500)}`);
}

function getPayloadHints(item: ConvertedQuestion): NonNullable<GeminiDebugEntry["payloadHints"]> {
  return {
    hasChoices: [item.row.choice_0, item.row.choice_1, item.row.choice_2, item.row.choice_3].some(Boolean),
    hasImageUrl: Boolean(item.row.imageUrl),
    imageUrlCount: item.promptContext.imageUrls.length,
    hasExtraTableCsv: Boolean(item.promptContext.extraTableCsv),
    hasExtraSvg: Boolean(item.promptContext.extraSvg),
    hasVizMarker: /\{viz\}/i.test(`${item.row.passage ?? ""}\n${item.row.questionText ?? ""}`),
    questionTextLength: normalizeText(item.row.questionText ?? "").length,
    passageLength: normalizeText(item.row.passage ?? "").length,
  };
}

function getSourceDataIssue(item: ConvertedQuestion) {
  if (item.skipped) {
    return null;
  }

  const hints = getPayloadHints(item);
  const questionText = normalizeText(item.row.questionText ?? "");
  const passage = normalizeText(item.row.passage ?? "");
  const hasVisualContext = hints.hasExtraTableCsv || hints.hasExtraSvg || hints.hasImageUrl || hints.imageUrlCount > 0;
  const hasChoices = hints.hasChoices;
  const tableLikeOnly = item.row.questionType === "spr"
    && !hasChoices
    && hints.hasExtraTableCsv
    && !passage
    && questionText.length > 0
    && questionText.length < 160
    && !/\b(?:what|which|how|if|find|calculate|value|probability|mean|median|range|percent|total|number|solve)\b/i.test(questionText);

  if (hints.hasVizMarker && !hasVisualContext) {
    return {
      issue: "source_missing_visual",
      message: "Question references {viz} data, but the scraped row has no table CSV, SVG, imageUrl, or imageUrls.",
    };
  }

  const combinedText = `${questionText}\n${passage}`;
  const requiresVisualPayload =
    /\b(?:graph|figure|scatterplot|dot plot|histogram|line plot|bar graph|coordinate plane)\b[^.?!]{0,80}\b(?:shown|above|below|represents|models)\b/i.test(combinedText)
    || /\b(?:shown|above|below)\s+(?:in|on)\s+the\s+(?:graph|figure|scatterplot|dot plot|histogram|line plot|bar graph|coordinate plane)\b/i.test(combinedText)
    || /\baccording to the\s+(?:graph|figure|scatterplot|dot plot|histogram|line plot|bar graph|table)\b/i.test(combinedText)
    || /\buses?\s+data\s+from\s+the\s+(?:graph|table|figure|scatterplot)\b/i.test(combinedText)
    || /\b(?:table|graph|figure|scatterplot)\s+(?:shows|summarizes|presents)\b/i.test(combinedText);

  if (requiresVisualPayload && !hasVisualContext) {
    return {
      issue: "source_missing_visual",
      message: "Question references a graph/figure/shown visual, but the scraped row has no visual payload.",
    };
  }

  if (tableLikeOnly) {
    return {
      issue: "source_missing_question",
      message: "Row contains a table/title but no actual question prompt or answer choices.",
    };
  }

  if (item.row.questionType === "spr" && !hasChoices && !questionText) {
    return {
      issue: "source_missing_question",
      message: "SPR row has no question text and no choices.",
    };
  }

  return null;
}

function buildSourceDataError(item: ConvertedQuestion, issue: NonNullable<ReturnType<typeof getSourceDataIssue>>): SourceDataError {
  return {
    id: item.id,
    source: item.source,
    sourceFile: item.sourceFile,
    csvRowNumber: item.csvRowNumber,
    issue: issue.issue,
    message: issue.message,
    row: item.row,
    promptContext: item.promptContext,
    payloadHints: getPayloadHints(item),
  };
}

function callGemini(batch: ConvertedQuestion[]) {
  const basePrompt = buildGeminiPrompt(batch);
  let lastError = "";

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const strictPrefix = attempt === 1
      ? "Return a raw JSON array only. Do not wrap it in markdown fences. Do not include prose."
      : "Your previous response or request failed. Return ONLY a syntactically valid raw JSON array with no markdown, no comments, and no prose.";
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", "$input | gemini --model $env:GEMINI_MODEL --prompt $env:GEMINI_PROMPT"], {
      input: basePrompt,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 16,
      env: {
        ...process.env,
        GEMINI_MODEL: geminiModel,
        GEMINI_PROMPT: strictPrefix,
      },
    });
    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    geminiDebugLog.push({
      type: "api_attempt",
      batchIds: batch.map((item) => item.id),
      attempt,
      status: result.status,
      stdoutPreview: (result.stdout ?? "").slice(0, 1200),
      stderrPreview: (result.stderr ?? "").slice(0, 1200),
    });

    if (result.status === 0) {
      try {
        return parseGeminiJson(result.stdout);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        geminiDebugLog.push({
          type: "malformed_json",
          batchIds: batch.map((item) => item.id),
          attempt,
          reason: lastError,
          stdoutPreview: (result.stdout ?? "").slice(0, 2400),
          stderrPreview: (result.stderr ?? "").slice(0, 1200),
        });
        if (attempt < 5) {
          sleepSync(1000 * attempt);
          continue;
        }
        break;
      }
    }

    lastError = combinedOutput;
    if (isRateLimitOutput(combinedOutput) && attempt < 5) {
      const delayMs = Math.min(120000, (2 ** (attempt - 1)) * 5000 + Math.floor(Math.random() * 1000));
      console.log(`Gemini rate limited; retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt}/5)`);
      sleepSync(delayMs);
      continue;
    }

    break;
  }

  if (isRateLimitOutput(lastError)) {
    throw new Error(`Gemini quota/rate limit reached for ${geminiModel}: ${lastError.slice(0, 1000)}`);
  }

  throw new Error(`Gemini failed for ${geminiModel}: ${lastError.slice(0, 1000)}`);
}

function callCodex(batch: ConvertedQuestion[]) {
  const basePrompt = [
    "Return a raw JSON array only. Do not wrap it in markdown fences. Do not include prose.",
    "You are answering a data-conversion subtask. Do not edit files or run commands.",
    buildGeminiPrompt(batch),
  ].join("\n\n");
  let lastError = "";

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const outputPath = path.join(outputDir, "reports", `codex-response-${Date.now()}-${attempt}.json`);
    const result = spawnSync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        codexBin,
        "-a",
        "never",
        "exec",
        "--model",
        codexModel,
        "--sandbox",
        "read-only",
        "--cd",
        process.cwd(),
        "--output-last-message",
        outputPath,
        "-",
      ],
      {
        input: basePrompt,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 16,
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
        },
      },
    );
    const finalMessage = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
    const combinedOutput = `${finalMessage}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    const spawnDiagnostic = [
      result.error ? `spawn error: ${result.error.message}` : "",
      result.status !== null ? `exit status: ${result.status}` : "",
      result.signal ? `signal: ${result.signal}` : "",
      combinedOutput,
    ].filter(Boolean).join("\n").trim() || "Codex CLI exited without stdout, stderr, output-last-message, or spawn error.";
    geminiDebugLog.push({
      type: "api_attempt",
      batchIds: batch.map((item) => item.id),
      attempt,
      status: result.status,
      reason: spawnDiagnostic.slice(0, 1200),
      stdoutPreview: (result.stdout ?? "").slice(0, 1200),
      stderrPreview: (result.stderr ?? "").slice(0, 1200),
    });

    if (result.status === 0) {
      try {
        return parseGeminiJson(finalMessage || result.stdout);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        geminiDebugLog.push({
          type: "malformed_json",
          batchIds: batch.map((item) => item.id),
          attempt,
          reason: lastError,
          stdoutPreview: combinedOutput.slice(0, 2400),
          stderrPreview: (result.stderr ?? "").slice(0, 1200),
        });
        if (attempt < 5) {
          sleepSync(1000 * attempt);
          continue;
        }
        break;
      }
    }

    lastError = spawnDiagnostic;
    if (attempt < 5) {
      const rateLimited = isRateLimitOutput(spawnDiagnostic);
      const delayMs = rateLimited
        ? Math.min(120000, (2 ** (attempt - 1)) * 5000 + Math.floor(Math.random() * 1000))
        : Math.min(30000, attempt * 3000 + Math.floor(Math.random() * 1000));
      console.log(`Codex ${rateLimited ? "rate limited" : "failed"}; retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt}/5): ${spawnDiagnostic.slice(0, 300).replace(/\s+/g, " ")}`);
      sleepSync(delayMs);
      continue;
    }

    break;
  }

  if (isRateLimitOutput(lastError)) {
    throw new Error(`Codex quota/rate limit reached for ${codexModel} with CODEX_HOME=${codexHome} and CODEX_BIN=${codexBin}: ${lastError.slice(0, 1000)}`);
  }

  throw new Error(`Codex failed for ${codexModel} with CODEX_HOME=${codexHome} and CODEX_BIN=${codexBin}: ${lastError.slice(0, 1000)}`);
}

function callAi(batch: ConvertedQuestion[]) {
  return aiProvider === "codex" ? callCodex(batch) : callGemini(batch);
}

function applyGeminiAnswer(item: ConvertedQuestion, answer: GeminiAnswer) {
  const type = item.row.questionType;
  let classified = false;

  const nextSection = normalizeText(answer.section ?? "");
  const nextDomain = normalizeText(answer.domain ?? "");
  const nextSkill = normalizeText(answer.skill ?? "");
  if (nextSection || nextDomain || nextSkill) {
    if (!isValidTaxonomy(nextSection, nextDomain, nextSkill)) {
      geminiDebugLog.push({
        type: "invalid_answer",
        itemId: item.id,
        cacheKey: item.answerCacheKey,
        reason: "Gemini returned invalid section/domain/skill taxonomy.",
        answer,
        payloadHints: getPayloadHints(item),
      });
      item.issues.push("gemini_invalid_taxonomy");
      return { answered: false, classified: false };
    }

    item.row.section = nextSection;
    item.row.domain = nextDomain;
    item.row.skill = nextSkill;
    classified = true;
  }

  if (type === "multiple_choice") {
    const choices = [item.row.choice_0, item.row.choice_1, item.row.choice_2, item.row.choice_3].map((choice) => normalizeText(choice ?? ""));
    const letterIndex = ["A", "B", "C", "D"].indexOf(normalizeText(answer.answerLetter ?? answer.answer ?? "").toUpperCase());
    const exactAnswer = normalizeContentForJson(answer.answer ?? "");
    const exactAnswerIndex = choices.findIndex((choice) => choice === exactAnswer);
    const nextAnswer = letterIndex >= 0 && choices[letterIndex] ? getChoiceCode(letterIndex) : (exactAnswerIndex >= 0 ? getChoiceCode(exactAnswerIndex) : "");

    if (answer.needsReview && !nextAnswer) {
      geminiDebugLog.push({
        type: "needs_review",
        itemId: item.id,
        cacheKey: item.answerCacheKey,
        reason: answer.reason || "Gemini returned needsReview without a usable answer.",
        answer,
        payloadHints: getPayloadHints(item),
      });
      item.issues.push("gemini_needs_review");
      return { answered: false, classified };
    }

    if (!nextAnswer) {
      geminiDebugLog.push({
        type: "invalid_answer",
        itemId: item.id,
        cacheKey: item.answerCacheKey,
        reason: "Gemini answer did not match any answer choice.",
        answer,
        payloadHints: getPayloadHints(item),
      });
      item.issues.push("gemini_answer_does_not_match_choice");
      return { answered: false, classified };
    }

    item.row.correctAnswer = nextAnswer;
    if (answer.needsReview) {
      geminiDebugLog.push({
        type: "needs_review",
        itemId: item.id,
        cacheKey: item.answerCacheKey,
        reason: "Gemini set needsReview but also returned a valid answer; accepted as low-confidence answer.",
        answer,
        payloadHints: getPayloadHints(item),
      });
    }
    return { answered: true, classified };
  }

  const sprAnswers = (Array.isArray(answer.sprAnswers) && answer.sprAnswers.length > 0 ? answer.sprAnswers : [answer.answer ?? ""])
    .map((sprAnswer) => normalizeContentForJson(sprAnswer))
    .filter(Boolean);

  if (answer.needsReview && sprAnswers.length === 0) {
    geminiDebugLog.push({
      type: "needs_review",
      itemId: item.id,
      cacheKey: item.answerCacheKey,
      reason: answer.reason || "Gemini returned needsReview without an SPR answer.",
      answer,
      payloadHints: getPayloadHints(item),
    });
    item.issues.push("gemini_needs_review");
    return { answered: false, classified };
  }

  if (sprAnswers.length === 0) {
    geminiDebugLog.push({
      type: "invalid_answer",
      itemId: item.id,
      cacheKey: item.answerCacheKey,
      reason: "Gemini did not return an SPR answer.",
      answer,
      payloadHints: getPayloadHints(item),
    });
    item.issues.push("gemini_missing_spr_answer");
    return { answered: false, classified };
  }

  item.row.sprAnswers = [...new Set(sprAnswers)];
  item.row.sprAnswer_0 = item.row.sprAnswers[0] ?? "";
  item.row.sprAnswer_1 = item.row.sprAnswers[1] ?? "";
  item.row.sprAnswer_2 = item.row.sprAnswers[2] ?? "";
  if (answer.needsReview) {
    geminiDebugLog.push({
      type: "needs_review",
      itemId: item.id,
      cacheKey: item.answerCacheKey,
      reason: "Gemini set needsReview but also returned a valid SPR answer; accepted as low-confidence answer.",
      answer,
      payloadHints: getPayloadHints(item),
    });
  }
  return { answered: true, classified };
}

function isMissingAnswerCandidate(item: ConvertedQuestion) {
  if (item.skipped) {
    return false;
  }

  if (item.row.questionType === "multiple_choice") {
    return !normalizeText(item.row.correctAnswer ?? "") && [item.row.choice_0, item.row.choice_1, item.row.choice_2, item.row.choice_3].filter(Boolean).length >= 2;
  }

  return !Array.isArray(item.row.sprAnswers) || item.row.sprAnswers.length === 0;
}

function isMissingTaxonomyCandidate(item: ConvertedQuestion) {
  if (item.skipped) {
    return false;
  }

  return !isValidTaxonomy(normalizeText(item.row.section ?? ""), normalizeText(item.row.domain ?? ""), normalizeText(item.row.skill ?? ""));
}

function isGeminiCandidate(item: ConvertedQuestion) {
  if (getSourceDataIssue(item)) {
    return false;
  }

  return (shouldFillMissingAnswers && isMissingAnswerCandidate(item)) || (shouldClassifyMetadata && isMissingTaxonomyCandidate(item));
}

function cachedAnswerSatisfiesItem(answer: GeminiAnswer | undefined, item: ConvertedQuestion) {
  if (!answer) {
    return false;
  }

  if (shouldClassifyMetadata && isMissingTaxonomyCandidate(item) && !isValidTaxonomy(answer.section ?? "", answer.domain ?? "", answer.skill ?? "")) {
    return false;
  }

  if (!shouldFillMissingAnswers || !isMissingAnswerCandidate(item)) {
    return true;
  }

  if (item.row.questionType === "multiple_choice") {
    return Boolean(normalizeText(answer.answerLetter ?? answer.answer ?? ""));
  }

  return Boolean(normalizeText(answer.answer ?? "") || (Array.isArray(answer.sprAnswers) && answer.sprAnswers.some((value) => normalizeText(value))));
}

function getCachedAnswer(cache: Map<string, GeminiAnswer>, item: ConvertedQuestion) {
  return cache.get(item.answerCacheKey) ?? cache.get(item.id);
}

function applySourceDataGate(items: ConvertedQuestion[]) {
  const sourceDataErrors: SourceDataError[] = [];

  for (const item of items) {
    const issue = getSourceDataIssue(item);
    if (!issue) {
      continue;
    }

    if (!item.issues.includes(issue.issue)) {
      item.issues.push(issue.issue);
    }
    sourceDataErrors.push(buildSourceDataError(item, issue));
  }

  return sourceDataErrors;
}

function fillMissingAnswers(items: ConvertedQuestion[]) {
  const cachePath = path.join(outputDir, "reports", answerCacheFileName);
  const cache = loadGeminiCache(cachePath);
  const candidates = items.filter(isGeminiCandidate);
  const uniqueCandidates = [...new Map(candidates.map((item) => [item.answerCacheKey, item])).values()];
  const limitedCandidates = geminiLimit > 0 ? uniqueCandidates.slice(0, geminiLimit) : uniqueCandidates;
  const limitedKeys = new Set(limitedCandidates.map((item) => item.answerCacheKey));
  let answered = 0;
  let classified = 0;
  let review = 0;
  let newAiRequests = 0;

  for (let index = 0; index < limitedCandidates.length; index += geminiBatchSize) {
    const batch = limitedCandidates.slice(index, index + geminiBatchSize);
    const uncached = batch.filter((item) => !cachedAnswerSatisfiesItem(getCachedAnswer(cache, item), item));

    if (uncached.length > 0 && !shouldApplyCacheOnly && (aiNewLimit <= 0 || newAiRequests < aiNewLimit)) {
      const requestBatch = aiNewLimit > 0 ? uncached.slice(0, Math.max(0, aiNewLimit - newAiRequests)) : uncached;
      console.log(`${aiProvider === "codex" ? "Codex CLI" : "Gemini"} batch ${index + 1}-${index + batch.length} of ${limitedCandidates.length}`);
      try {
        const answers = callAi(requestBatch);
        for (const answer of answers) {
          const matchedItem = requestBatch.find((item) => item.id === answer.id || item.answerCacheKey === answer.cacheKey);
          const cacheKey = matchedItem?.answerCacheKey ?? answer.cacheKey ?? answer.id;
          cache.set(cacheKey, { ...answer, cacheKey });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!shouldContinueOnAiError) {
          saveGeminiCache(cachePath, cache);
          throw error;
        }

        console.error(`${aiProvider === "codex" ? "Codex CLI" : "Gemini"} batch failed; marking ${requestBatch.length} item(s) for review and continuing: ${message.slice(0, 500)}`);
        for (const item of requestBatch) {
          if (!item.issues.includes("ai_batch_failed")) {
            item.issues.push("ai_batch_failed");
          }
          geminiDebugLog.push({
            type: "invalid_answer",
            itemId: item.id,
            cacheKey: item.answerCacheKey,
            reason: message,
            payloadHints: getPayloadHints(item),
          });
        }
      }
      newAiRequests += requestBatch.length;
      saveGeminiCache(cachePath, cache);
    }
  }

  for (const item of candidates.filter((candidate) => limitedKeys.has(candidate.answerCacheKey))) {
    const answer = getCachedAnswer(cache, item);
    if (!answer) {
      if (shouldApplyCacheOnly || aiNewLimit > 0) {
        continue;
      }
      item.issues.push("gemini_missing_cached_answer");
      review += 1;
      continue;
    }
    const result = applyGeminiAnswer(item, answer);
    if (result.classified) {
      classified += 1;
    }
    if (result.answered) {
      answered += 1;
    } else {
      review += isMissingAnswerCandidate(item) ? 1 : 0;
    }
  }

  return {
    geminiCandidates: candidates.length,
    geminiAnswered: answered,
    geminiClassified: classified,
    geminiNeedsReview: review,
  };
}

function summarize(
  items: ConvertedQuestion[],
  conversionErrors: ConversionError[],
  sourceDataErrors: SourceDataError[],
  geminiStats: Pick<RunSummary, "geminiCandidates" | "geminiAnswered" | "geminiClassified" | "geminiNeedsReview">,
): RunSummary {
  const summary: RunSummary = {
    aiProvider,
    aiModel,
    sources: {
      bluebooky: items.filter((item) => item.source === "bluebooky").length,
      satgpt: items.filter((item) => item.source === "satgpt").length,
    },
    rowsRead: items.length,
    parseErrors: conversionErrors.filter((error) => error.severity === "error").length,
    skipped: items.filter((item) => item.skipped).length,
    ready: items.filter((item) => !item.skipped && item.issues.length === 0).length,
    needsReview: items.filter((item) => !item.skipped && item.issues.length > 0).length,
    ...geminiStats,
    geminiSkippedSourceErrors: sourceDataErrors.length,
    issues: {},
  };

  for (const item of items) {
    for (const issue of item.skipped ? [item.skipReason ?? "skipped"] : item.issues) {
      summary.issues[issue] = (summary.issues[issue] ?? 0) + 1;
    }
  }

  for (const error of conversionErrors) {
    summary.issues[error.code] = (summary.issues[error.code] ?? 0) + 1;
  }

  return summary;
}

function writeOutputs(
  items: ConvertedQuestion[],
  conversionErrors: ConversionError[],
  sourceDataErrors: SourceDataError[],
  summary: RunSummary,
) {
  const adminDir = path.join(outputDir, "admin-json");
  const reportDir = path.join(outputDir, "reports");
  mkdirSync(adminDir, { recursive: true });
  mkdirSync(reportDir, { recursive: true });

  const byFile = new Map<string, ConvertedQuestion[]>();
  for (const item of items) {
    const key = `${item.source}-${slugFromFile(item.sourceFile)}`;
    byFile.set(key, [...(byFile.get(key) ?? []), item]);
  }

  const readyRows: AdminQuestionUploadRow[] = [];
  const readyProvenance: Array<{
    readyIndex: number;
    id: string;
    answerCacheKey: string;
    source: SourceKind;
    sourceFile: string;
    csvRowNumber: number;
    section: string;
    module: number;
    questionType: string;
    domain: string;
    skill: string;
  }> = [];
  const reviewItems: ConvertedQuestion[] = [];
  const missingRequests: unknown[] = [];

  for (const [key, fileItems] of byFile) {
    const fileReadyItems = fileItems.filter((item) => !item.skipped && item.issues.length === 0);
    const fileReady = fileReadyItems.map((item) => item.row);
    const fileReview = fileItems.filter((item) => item.skipped || item.issues.length > 0);
    for (const item of fileReadyItems) {
      readyProvenance.push({
        readyIndex: readyProvenance.length + 1,
        id: item.id,
        answerCacheKey: item.answerCacheKey,
        source: item.source,
        sourceFile: item.sourceFile,
        csvRowNumber: item.csvRowNumber,
        section: item.row.section,
        module: item.row.module,
        questionType: item.row.questionType,
        domain: item.row.domain,
        skill: item.row.skill,
      });
    }
    readyRows.push(...fileReady);
    reviewItems.push(...fileReview);
    writeJsonAtomic(path.join(adminDir, `${key}.ready.json`), fileReady);
    writeJsonAtomic(path.join(adminDir, `${key}.needs_review.json`), fileReview);
  }

  for (const item of items.filter(isGeminiCandidate)) {
    missingRequests.push({
      id: item.id,
      section: item.row.section,
      module: item.row.module,
      questionType: item.row.questionType,
      passage: item.row.passage,
      questionText: item.row.questionText,
      choices: [item.row.choice_0, item.row.choice_1, item.row.choice_2, item.row.choice_3].filter(Boolean),
      imageUrl: item.row.imageUrl,
      imageUrls: item.promptContext.imageUrls,
      extraPlainText: item.promptContext.extraPlainText,
      extraTableCsv: item.promptContext.extraTableCsv,
      extraSvg: item.promptContext.extraSvg,
    });
  }

  const geminiNeedsReviewItems = reviewItems
    .filter((item) => item.issues.includes("gemini_needs_review"))
    .map((item) => ({
      id: item.id,
      cacheKey: item.answerCacheKey,
      source: item.source,
      sourceFile: item.sourceFile,
      csvRowNumber: item.csvRowNumber,
      issues: item.issues,
      row: item.row,
      promptContext: item.promptContext,
      cachedGeminiAnswer: loadGeminiCache(path.join(reportDir, answerCacheFileName)).get(item.answerCacheKey) ?? null,
      payloadHints: getPayloadHints(item),
    }));

  writeJsonAtomic(path.join(adminDir, "all.ready.json"), readyRows);
  writeJsonAtomic(path.join(adminDir, "all.needs_review.json"), reviewItems);
  writeJsonAtomic(path.join(reportDir, "conversion-report.json"), summary);
  writeJsonAtomic(path.join(reportDir, "ready-provenance.json"), {
    summary: {
      ready: readyRows.length,
      sources: new Set(readyProvenance.map((item) => `${item.source}:${item.sourceFile}`)).size,
    },
    groups: [...readyProvenance.reduce((map, item) => {
      const key = `${item.source}:${item.sourceFile}`;
      const group = map.get(key) ?? {
        source: item.source,
        sourceFile: item.sourceFile,
        firstReadyIndex: item.readyIndex,
        lastReadyIndex: item.readyIndex,
        count: 0,
        firstCsvRowNumber: item.csvRowNumber,
        lastCsvRowNumber: item.csvRowNumber,
      };
      group.lastReadyIndex = item.readyIndex;
      group.count += 1;
      group.firstCsvRowNumber = Math.min(group.firstCsvRowNumber, item.csvRowNumber);
      group.lastCsvRowNumber = Math.max(group.lastCsvRowNumber, item.csvRowNumber);
      map.set(key, group);
      return map;
    }, new Map<string, {
      source: SourceKind;
      sourceFile: string;
      firstReadyIndex: number;
      lastReadyIndex: number;
      count: number;
      firstCsvRowNumber: number;
      lastCsvRowNumber: number;
    }>()).values()],
    items: readyProvenance,
  });
  writeJsonAtomic(path.join(reportDir, "errors.json"), conversionErrors);
  writeJsonAtomic(path.join(reportDir, "source-data-errors.json"), sourceDataErrors);
  writeJsonAtomic(path.join(reportDir, "gemini-needs-review.json"), geminiNeedsReviewItems);
  writeJsonAtomic(path.join(reportDir, "gemini-debug-log.json"), geminiDebugLog);
  writeTextAtomic(path.join(reportDir, "missing-answer-requests.jsonl"), `${missingRequests.map((request) => JSON.stringify(request)).join("\n")}\n`);
}

async function main() {
  mkdirSync(path.join(outputDir, "reports"), { recursive: true });
  const files = [
    ...(sourceFilter === "all" || sourceFilter === "bluebooky" ? getCsvFiles("bluebooky") : []),
    ...(sourceFilter === "all" || sourceFilter === "satgpt" ? getCsvFiles("satgpt") : []),
  ];
  const items: ConvertedQuestion[] = [];
  const conversionErrors: ConversionError[] = [];

  for (const file of files) {
    const rows = readCsv(file.source, file.filePath, conversionErrors);
    for (let index = 0; index < rows.length; index += 1) {
      const item = file.source === "bluebooky"
        ? convertBluebookyRow(file.fileName, rows[index].row, rows[index].sourceRowNumber)
        : convertSatgptRow(file.fileName, rows[index].row, rows[index].sourceRowNumber);
      items.push(item);
    }
  }

  const sourceDataErrors = applySourceDataGate(items);

  let geminiStats = {
    geminiCandidates: items.filter(isGeminiCandidate).length,
    geminiAnswered: 0,
    geminiClassified: 0,
    geminiNeedsReview: 0,
  };

  if (shouldFillMissingAnswers || shouldClassifyMetadata) {
    geminiStats = fillMissingAnswers(items);
  }

  for (const item of items) {
    collectIssues(item);
  }

  const summary = summarize(items, conversionErrors, sourceDataErrors, geminiStats);
  writeOutputs(items, conversionErrors, sourceDataErrors, summary);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote admin JSON to ${path.join(outputDir, "admin-json")}`);
  console.log(`Wrote reports to ${path.join(outputDir, "reports")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
