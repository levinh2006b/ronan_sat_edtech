import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import dotenv from "dotenv";
import { Pool, type PoolClient } from "pg";

import {
  getQuestionExtraSvgMarkup,
  normalizeQuestionExtra,
  parseQuestionExtraTable,
  type ParsedQuestionExtraTable,
} from "@/lib/questionExtra";
import { repairScrapedMojibake } from "@/lib/scrapedQuestionContent";
import { renderKatexMarkup, tokenizeHtmlLatexContent } from "@/utils/latexTokenizer";
import { normalizeMathDelimiters } from "@/utils/mathContentNormalizer";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.development" });

type QuestionDifficulty = "easy" | "medium" | "hard";
type QuestionType = "multiple_choice" | "spr";
type EvalStatus = "valid" | "defective" | "needs_visual_review" | "needs_math_review";
type VisualAssetState = "text_table" | "svg_visual" | "image_visual" | "missing_visual" | "bad_extra" | "none";

type Args = {
  batchSize: number;
  execute: boolean;
  ids: string[] | null;
  knownIssuesJson: string | null;
  limit: number | null;
  llmBatchSize: number;
  llmConcurrency: number;
  llmProvider: "opencode" | "openai";
  llmTimeoutMs: number;
  maxAttempts: number;
  maxEvaluatorTokens: number;
  maxSolverTokens: number;
  minEvaluatorConfidence: number;
  openaiDisableThinking: boolean;
  openaiApiKeyEnv: string;
  openaiBaseUrl: string;
  evaluatorFallbackModel: string | null;
  evaluatorModel: string;
  evaluatorMaxAttempts: number;
  maxNew: number | null;
  opencodeAgent: string;
  opencodeBin: string;
  outputDir: string;
  publicOnly: boolean;
  retryFailedPath: string | null;
  resume: boolean;
  sample: number | null;
  selfTest: boolean;
  shutdownOnComplete: boolean;
  shutdownDelaySeconds: number;
  skipCompletedFrom: string[];
  splitOnTimeout: boolean;
  solverConcurrency: number;
  solverModel: string;
  supabasePoolerHost: string;
  useSupabasePooler: boolean;
  workers: number;
};

type QuestionOption = {
  id: string;
  optionCode: string;
  optionText: string;
  displayOrder: number;
};

type CorrectOption = {
  optionId: string;
  optionCode: string;
  optionText: string;
  displayOrder: number;
} | null;

type SprAnswer = {
  id: string;
  acceptedAnswer: string;
  displayOrder: number;
};

type QuestionRow = {
  id: string;
  legacyMongoId: string | null;
  sectionId: string;
  sectionName: string;
  moduleNumber: number | null;
  position: number;
  questionType: QuestionType;
  questionText: string;
  passage: string | null;
  explanation: string;
  difficulty: QuestionDifficulty;
  points: number;
  domain: string | null;
  skill: string | null;
  imageUrl: string | null;
  extra: unknown;
  testId: string;
  testTitle: string;
  testVisibility: string;
  options: QuestionOption[];
  correctOption: CorrectOption;
  sprAnswers: SprAnswer[];
};

type SolverResult = {
  solver: number;
  questionId: string;
  answer: {
    type: QuestionType;
    optionCode?: string;
    optionText?: string;
    acceptedAnswer?: string;
    acceptedAnswers?: string[];
  };
  confidence: number;
  defectiveSignals: string[];
  needsVisualReview?: boolean;
  needsMathReview?: boolean;
  reasoning: string;
};

type EvaluatorResult = {
  questionId: string;
  status: EvalStatus;
  confidence: number;
  defectiveReasons: string[];
  verifiedAnswer?: {
    type: QuestionType;
    optionCode?: string;
    optionText?: string;
    acceptedAnswer?: string;
    acceptedAnswers?: string[];
  };
  taxonomy?: {
    section: string;
    domain: string;
    skill: string;
  };
  difficulty?: QuestionDifficulty;
  needsVisualReview?: boolean;
  needsMathReview?: boolean;
  notes?: string;
};

type QuestionAssetAnalysis = {
  visualState: VisualAssetState;
  mentionsVisual: boolean;
  tableMarkdown: string | null;
  svgPresent: boolean;
  imagePresent: boolean;
  badExtraReason: string | null;
  mathWarnings: MathWarning[];
  visualWarnings: string[];
};

type MathWarning = {
  field: string;
  segment: string;
};

type RendererTextPayload = {
  sourceText: string;
  rendererText: string;
  mathSegments: Array<{
    delimiter: "$" | "$$" | "\\(" | "\\[";
    value: string;
    start: number;
  }>;
  katexErrors: MathWarning[];
};

type EvaluationOutcome = {
  question: QuestionRow;
  assetAnalysis: QuestionAssetAnalysis;
  solverResults: SolverResult[];
  evaluator: EvaluatorResult;
  fastPath?: "defective_visual" | "visual_review" | "defective_placeholder_options" | "known_issue";
};

type SolverResultCache = Map<string, SolverResult[]>;

type TextPatch = {
  path: string;
  before: unknown;
  after: unknown;
};

type MutationPlan = {
  questionId: string;
  replacementSourceId?: string;
  questionUpdate: Record<string, unknown>;
  optionUpdates: Array<{ id: string; option_code?: string; option_text?: string; display_order?: number }>;
  correctOptionId?: string | null;
  sprAnswers?: string[];
  textPatches: TextPatch[];
  reasons: string[];
};

type ProcessResult = {
  id: string;
  success: boolean;
  status?: EvalStatus;
  patchApplied: boolean;
  replacementSourceId?: string;
  error?: string;
};

type QualityIssue = {
  type: string;
  severity: "info" | "warning" | "error";
  details: Record<string, unknown>;
};

type KnownIssue =
  | {
      id: string;
      type: "answer_key_correction";
      reason: string;
      correctOptionCode: string;
    }
  | {
      id: string;
      type: "defective";
      reason: string;
    };

type EvaluatorAnswerRecord = {
  runOrder: number;
  id: string;
  testTitle: string;
  sectionName: string;
  moduleNumber: number | null;
  position: number;
  questionType: QuestionType;
  questionText: string;
  passage: string | null;
  choices: QuestionOption[];
  dbAnswer: ReturnType<typeof buildOfficialAnswer>;
  dbAnswerLabel: string | null;
  evaluatorStatus: EvalStatus;
  evaluatorConfidence: number;
  evaluatorVerifiedAnswer: EvaluatorResult["verifiedAnswer"] | null;
  evaluatorAnswerLabel: string | null;
  evaluatorDefectiveReasons: string[];
  evaluatorNeedsVisualReview: boolean;
  evaluatorNeedsMathReview: boolean;
  evaluatorTaxonomy: EvaluatorResult["taxonomy"] | null;
  evaluatorDifficulty: QuestionDifficulty | null;
  evaluatorNotes: string | null;
  solverAnswers: Array<{
    solver: number;
    answer: SolverResult["answer"];
    answerLabel: string | null;
    confidence: number;
    needsVisualReview: boolean;
    needsMathReview: boolean;
    defectiveSignals: string[];
    reasoning: string | null;
  }>;
  answerChangedByEvaluator: boolean;
  fastPath: EvaluationOutcome["fastPath"] | null;
};

const DEFAULT_PROJECT_REF = "afmeruhjbgqeebczpxzf";
const POINTS_BY_DIFFICULTY: Record<QuestionDifficulty, number> = {
  hard: 10,
  medium: 20,
  easy: 30,
};

const BUILTIN_KNOWN_ISSUES: KnownIssue[] = [
  {
    id: "3ee20bdd-f073-4183-835e-6f2364b46941",
    type: "answer_key_correction",
    correctOptionCode: "choice_2",
    reason: "Grammar: em dash must close the parenthetical phrase before the main so-that structure continues.",
  },
  {
    id: "25bcf9c4-68f8-456d-8324-44d53c1a9155",
    type: "answer_key_correction",
    correctOptionCode: "choice_1",
    reason: "Math: solve sqrt(6a+7)=-9a with a<=0; valid solution is -7/27.",
  },
  {
    id: "f8d09cdc-6136-4a73-b67c-993cd9147c36",
    type: "defective",
    reason: "Prompt is truncated/incomplete; given information leads to -2<x<-1 but no answer choice matches.",
  },
];

let knownIssuesById = new Map<string, KnownIssue>(BUILTIN_KNOWN_ISSUES.map((issue) => [issue.id, issue]));
const evaluatorAnswerRecords: EvaluatorAnswerRecord[] = [];
let evaluatorAnswerRunOrder = 0;

const SECTION_TAXONOMY = {
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

const args = parseArgs(process.argv.slice(2));

function parseArgs(rawArgs: string[]): Args {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, ...rest] = arg.slice(2).split("=");
    if (rest.length > 0) {
      values.set(rawKey, rest.join("="));
      continue;
    }

    const next = rawArgs[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(rawKey, next);
      index += 1;
    } else {
      flags.add(rawKey);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = values.get("output-dir") ?? path.join(os.homedir(), "Desktop", `question-corpus-evaluation-${timestamp}`);
  const ids = values.get("ids")?.split(",").map((id) => id.trim()).filter(Boolean) ?? null;
  const sharedModel = values.get("model");

  return {
    batchSize: readPositiveInteger(values, "batch-size", 50),
    execute: flags.has("execute"),
    evaluatorFallbackModel: values.get("evaluator-fallback-model") ?? process.env.QUESTION_EVAL_EVALUATOR_FALLBACK_MODEL ?? null,
    evaluatorMaxAttempts: readPositiveInteger(values, "evaluator-max-attempts", 2),
    evaluatorModel: values.get("evaluator-model") ?? sharedModel ?? "opencode-go/deepseek-v4-pro",
    ids,
    knownIssuesJson: values.get("known-issues-json") ?? null,
    limit: readOptionalPositiveInteger(values, "limit"),
    llmBatchSize: readPositiveInteger(values, "llm-batch-size", 5),
    llmConcurrency: readPositiveInteger(values, "llm-concurrency", 3),
    llmProvider: readLlmProvider(values),
    llmTimeoutMs: readPositiveInteger(values, "llm-timeout-ms", 180000),
    maxAttempts: readPositiveInteger(values, "max-attempts", 2),
    maxEvaluatorTokens: readPositiveInteger(values, "max-evaluator-tokens", 2000),
    maxSolverTokens: readPositiveInteger(values, "max-solver-tokens", 1200),
    maxNew: readOptionalPositiveInteger(values, "max-new"),
    minEvaluatorConfidence: readNumber(values, "min-evaluator-confidence", 0.8),
    openaiDisableThinking: values.get("openai-disable-thinking") !== "false",
    openaiApiKeyEnv: values.get("openai-api-key-env") ?? process.env.OPENAI_COMPAT_API_KEY_ENV ?? "OPENAI_API_KEY",
    openaiBaseUrl: values.get("openai-base-url") ?? process.env.OPENAI_COMPAT_BASE_URL ?? "https://api.openai.com/v1",
    opencodeAgent: values.get("opencode-agent") ?? process.env.OPENCODE_AGENT ?? "summary",
    opencodeBin: values.get("opencode-bin") ?? process.env.OPENCODE_BIN ?? getDefaultOpencodeBin(),
    outputDir,
    publicOnly: values.get("public-only") === "true",
    retryFailedPath: values.get("retry-failed") ?? null,
    resume: flags.has("resume"),
    sample: readOptionalPositiveInteger(values, "sample"),
    selfTest: flags.has("self-test"),
    shutdownDelaySeconds: readPositiveInteger(values, "shutdown-delay-seconds", 60),
    shutdownOnComplete: flags.has("shutdown-on-complete"),
    skipCompletedFrom: values.get("skip-completed-from")?.split(",").map((value) => value.trim()).filter(Boolean) ?? [],
    splitOnTimeout: values.get("split-on-timeout") !== "false",
    solverConcurrency: readPositiveInteger(values, "solver-concurrency", Math.max(3, readPositiveInteger(values, "llm-concurrency", 3))),
    solverModel: values.get("solver-model") ?? sharedModel ?? "opencode-go/deepseek-v4-flash",
    supabasePoolerHost: values.get("supabase-pooler-host") ?? process.env.SUPABASE_POOLER_HOST ?? "aws-1-ap-southeast-1.pooler.supabase.com",
    useSupabasePooler: flags.has("use-supabase-pooler") || process.env.SUPABASE_USE_POOLER === "true",
    workers: readPositiveInteger(values, "workers", 10),
  };
}

function readLlmProvider(values: Map<string, string>): Args["llmProvider"] {
  const provider = values.get("llm-provider") ?? process.env.QUESTION_EVAL_LLM_PROVIDER ?? "opencode";
  if (provider === "opencode" || provider === "openai") {
    return provider;
  }
  throw new Error(`Invalid --llm-provider: ${provider}. Use opencode or openai.`);
}

function getDefaultOpencodeBin() {
  const windowsCandidate = "C:\\nvm4w\\nodejs\\opencode.cmd";
  return process.platform === "win32" && existsSync(windowsCandidate) ? windowsCandidate : "opencode";
}

function readPositiveInteger(values: Map<string, string>, key: string, fallback: number) {
  const value = values.get(key);
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${key}: ${value}`);
  }
  return parsed;
}

function readOptionalPositiveInteger(values: Map<string, string>, key: string) {
  const value = values.get(key);
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${key}: ${value}`);
  }
  return parsed;
}

function readNumber(values: Map<string, string>, key: string, fallback: number) {
  const value = values.get(key);
  if (!value) return fallback;

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid --${key}: ${value}`);
  }
  return parsed;
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Provide it through dotenvx, .env.development, or shell env.`);
  }
  return value;
}

function buildPgConfig() {
  const directUrl = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  if (directUrl) {
    return {
      connectionString: directUrl,
      ssl: directUrl.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
    };
  }

  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || DEFAULT_PROJECT_REF;
  const password = getRequiredEnv("SUPABASE_DB_PASSWORD");
  if (args.useSupabasePooler) {
    return {
      host: args.supabasePoolerHost,
      port: Number.parseInt(process.env.SUPABASE_POOLER_PORT ?? "6543", 10),
      database: process.env.SUPABASE_DB_NAME?.trim() || "postgres",
      user: process.env.SUPABASE_POOLER_USER?.trim() || `postgres.${projectRef}`,
      password,
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    host: process.env.SUPABASE_DB_HOST?.trim() || `db.${projectRef}.supabase.co`,
    port: Number.parseInt(process.env.SUPABASE_DB_PORT ?? "5432", 10),
    database: process.env.SUPABASE_DB_NAME?.trim() || "postgres",
    user: process.env.SUPABASE_DB_USER?.trim() || "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  };
}

class JsonlLogger {
  private chains = new Map<string, Promise<void>>();

  constructor(private readonly root: string) {}

  async init() {
    await mkdir(this.root, { recursive: true });
  }

  write(name: string, entry: Record<string, unknown>) {
    const filePath = path.join(this.root, name);
    const previous = this.chains.get(filePath) ?? Promise.resolve();
    const next = previous.then(() => appendFile(filePath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf8"));
    this.chains.set(filePath, next.catch(() => undefined));
    return next;
  }

  async flush() {
    await Promise.all([...this.chains.values()]);
  }
}

class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire() {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release() {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

const logger = new JsonlLogger(args.outputDir);
const evaluatorLlmSemaphore = new Semaphore(args.llmConcurrency);
const solverLlmSemaphore = new Semaphore(args.solverConcurrency);

class NoContentModelOutputError extends Error {
  constructor(
    message: string,
    readonly details: {
      label: string;
      model: string;
      provider: Args["llmProvider"];
      hasReasoningContent: boolean;
      reasoningBytes: number;
      finishReason: string | null;
      durationMs: number;
    },
    readonly reasoningContent = "",
  ) {
    super(message);
    this.name = "NoContentModelOutputError";
  }
}

class MalformedModelOutputError extends Error {
  constructor(
    message: string,
    readonly details: {
      label: string;
      model: string;
      provider: Args["llmProvider"];
      contentBytes: number;
      finishReason: string | null;
      durationMs: number;
    },
    readonly outputText = "",
  ) {
    super(message);
    this.name = "MalformedModelOutputError";
  }
}

function isEscaped(value: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findClosingDoubleDollar(value: string, start: number) {
  for (let index = start; index < value.length - 1; index += 1) {
    if (value[index] === "$" && value[index + 1] === "$" && !isEscaped(value, index)) {
      return index;
    }
  }
  return -1;
}

export function convertDoubleDollarMath(value: string) {
  let cursor = 0;
  let result = "";
  let replacements = 0;

  while (cursor < value.length) {
    const opener = value.indexOf("$$", cursor);
    if (opener < 0) {
      result += value.slice(cursor);
      break;
    }

    if (isEscaped(value, opener)) {
      result += value.slice(cursor, opener + 2);
      cursor = opener + 2;
      continue;
    }

    const closer = findClosingDoubleDollar(value, opener + 2);
    if (closer < 0) {
      result += value.slice(cursor);
      break;
    }

    const content = value.slice(opener + 2, closer);
    if (!content.trim()) {
      result += value.slice(cursor, closer + 2);
      cursor = closer + 2;
      continue;
    }

    result += value.slice(cursor, opener);
    result += `\\(${content}\\)`;
    replacements += 1;
    cursor = closer + 2;
  }

  return { value: result, replacements };
}

function formatQuestionFields(question: QuestionRow) {
  const formatted = {
    questionUpdate: {} as Record<string, unknown>,
    optionUpdates: [] as MutationPlan["optionUpdates"],
    sprAnswers: undefined as string[] | undefined,
    textPatches: [] as TextPatch[],
  };

  const formatText = (pathName: string, value: string) => {
    const mojibakeRepaired = repairScrapedMojibake(value);
    const mathFormatted = convertDoubleDollarMath(mojibakeRepaired).value;
    if (mathFormatted === value) {
      return value;
    }

    formatted.textPatches.push({
      path: pathName,
      before: value,
      after: mathFormatted,
    });
    return mathFormatted;
  };

  const questionText = formatText("questions.question_text", question.questionText);
  if (questionText !== question.questionText) {
    formatted.questionUpdate.question_text = questionText;
  }

  if (question.passage !== null) {
    const passage = formatText("questions.passage", question.passage);
    if (passage !== question.passage) {
      formatted.questionUpdate.passage = passage;
    }
  }

  const explanation = formatText("questions.explanation", question.explanation);
  if (explanation !== question.explanation) {
    formatted.questionUpdate.explanation = explanation;
  }

  for (const option of question.options) {
    const optionText = formatText(`question_options.${option.id}.option_text`, option.optionText);
    if (optionText !== option.optionText) {
      formatted.optionUpdates.push({ id: option.id, option_text: optionText });
    }
  }

  const sprAnswers = question.sprAnswers.map((answer) =>
    formatText(`question_spr_accepted_answers.${answer.id}.accepted_answer`, answer.acceptedAnswer),
  );
  if (!arraysEqual(sprAnswers, question.sprAnswers.map((answer) => answer.acceptedAnswer))) {
    formatted.sprAnswers = sprAnswers;
  }

  return formatted;
}

function expectedPoints(difficulty: QuestionDifficulty) {
  return POINTS_BY_DIFFICULTY[difficulty];
}

function isQuestionDifficulty(value: unknown): value is QuestionDifficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function normalizeSectionName(value: string | null | undefined) {
  if (!value) return "";
  return value.toLowerCase().includes("math") ? "Math" : "Reading and Writing";
}

function isValidTaxonomy(section: string, domain: string | null | undefined, skill: string | null | undefined) {
  if (!domain || !skill) return false;
  const normalizedSection = normalizeSectionName(section);
  if (normalizedSection !== "Math" && normalizedSection !== "Reading and Writing") {
    return false;
  }

  const domains = SECTION_TAXONOMY[normalizedSection] as Record<string, readonly string[]>;
  return Boolean(domains[domain]?.includes(skill));
}

function buildOfficialAnswer(question: QuestionRow) {
  if (question.questionType === "multiple_choice") {
    return question.correctOption
      ? {
          type: "multiple_choice",
          optionCode: question.correctOption.optionCode,
          optionText: question.correctOption.optionText,
          displayOrder: question.correctOption.displayOrder,
        }
      : { type: "multiple_choice", optionCode: null, optionText: null };
  }

  return {
    type: "spr",
    acceptedAnswers: question.sprAnswers.map((answer) => answer.acceptedAnswer),
  };
}

function buildQuestionPayload(
  question: QuestionRow,
  assetAnalysis = analyzeQuestionAssets(question),
  options: { includeAnswerAndExplanation?: boolean } = {},
) {
  const includeAnswer = Boolean(options.includeAnswerAndExplanation);
  const questionTextPayload = buildRendererTextPayload("question_text", question.questionText);
  const passagePayload = question.passage ? buildRendererTextPayload("passage", question.passage) : null;
  return {
    id: question.id,
    test: {
      id: question.testId,
      title: question.testTitle,
      visibility: question.testVisibility,
      period: extractTestPeriod(question.testTitle),
    },
    section: {
      id: question.sectionId,
      name: question.sectionName,
      normalizedName: normalizeSectionName(question.sectionName),
      moduleNumber: question.moduleNumber,
      position: question.position,
    },
    taxonomy: {
      domain: question.domain,
      skill: question.skill,
    },
    difficulty: question.difficulty,
    points: question.points,
    questionType: question.questionType,
    contentForRenderer: {
      questionText: compactRendererTextPayload(questionTextPayload),
      passage: passagePayload ? compactRendererTextPayload(passagePayload) : null,
      explanation: null,
      choices: question.options.map((option) => ({
        optionCode: option.optionCode,
        displayOrder: option.displayOrder,
        optionText: compactRendererTextPayload(buildRendererTextPayload(`choice.${option.optionCode}`, option.optionText)),
      })),
    },
    sourceContent: {
      questionText: question.questionText,
      passage: question.passage,
      explanation: null,
    },
    choices: question.options.map((option) => ({
      id: option.id,
      optionCode: option.optionCode,
      displayOrder: option.displayOrder,
      optionText: option.optionText,
    })),
    officialAnswer: includeAnswer ? buildOfficialAnswer(question) : null,
    assetAnalysis,
    imageUrl: includeAnswer ? question.imageUrl : null,
    extra: question.extra,
  };
}

function compactRendererTextPayload(payload: RendererTextPayload) {
  return {
    rendererText: payload.rendererText,
    mathSegments: payload.mathSegments,
    katexErrors: payload.katexErrors,
  };
}

function buildRendererTextPayload(field: string, sourceText: string): RendererTextPayload {
  const rendererText = normalizeMathDelimiters(sourceText);
  const mathSegments = tokenizeHtmlLatexContent(rendererText)
    .filter((segment) => segment.type === "math")
    .map((segment) => ({
      delimiter: segment.delimiter,
      value: segment.value,
      start: segment.start,
    }));
  const katexErrors: MathWarning[] = [];

  for (const segment of mathSegments) {
    const markup = renderKatexMarkup(segment.delimiter, segment.value);
    if (markup.includes("katex-error")) {
      katexErrors.push({
        field,
        segment: segment.value,
      });
    }
  }

  return {
    sourceText,
    rendererText,
    mathSegments,
    katexErrors,
  };
}

function analyzeQuestionAssets(question: QuestionRow): QuestionAssetAnalysis {
  const table = parseQuestionExtraTable(question.extra);
  const normalizedExtra = normalizeQuestionExtra(question.extra);
  const svgMarkup = getQuestionExtraSvgMarkup(question.extra);
  const imagePresent = Boolean(question.imageUrl?.trim());
  const svgPresent = Boolean(svgMarkup);
  const tableMarkdown = table ? tableToMarkdown(table) : null;
  const mentionsVisual = mentionsVisualAsset(question);
  const hasExtra = question.extra !== null && question.extra !== undefined;
  const badExtraReason = hasExtra && normalizedExtra && !table && !svgMarkup
    ? `extra.type=${normalizedExtra.type} did not parse as a renderable table or SVG`
    : hasExtra && !normalizedExtra
      ? "extra payload is not a recognized QuestionExtra object"
      : null;
  const mathWarnings = [
    ...buildRendererTextPayload("question_text", question.questionText).katexErrors,
    ...(question.passage ? buildRendererTextPayload("passage", question.passage).katexErrors : []),
    ...buildRendererTextPayload("explanation", question.explanation).katexErrors,
    ...question.options.flatMap((option) => buildRendererTextPayload(`choice.${option.optionCode}`, option.optionText).katexErrors),
    ...question.sprAnswers.flatMap((answer) => buildRendererTextPayload(`spr_answer.${answer.displayOrder}`, answer.acceptedAnswer).katexErrors),
  ];
  const visualWarnings = collectVisualWarnings(question, svgMarkup);

  let visualState: VisualAssetState = "none";
  if (table) {
    visualState = "text_table";
  } else if (svgPresent) {
    visualState = "svg_visual";
  } else if (badExtraReason) {
    visualState = "bad_extra";
  } else if (mentionsVisual) {
    visualState = "missing_visual";
  } else if (imagePresent) {
    visualState = "image_visual";
  }

  return {
    visualState,
    mentionsVisual,
    tableMarkdown,
    svgPresent,
    imagePresent,
    badExtraReason,
    mathWarnings,
    visualWarnings,
  };
}

function collectVisualWarnings(question: QuestionRow, svgMarkup: string | null) {
  const warnings: string[] = [];
  if (svgMarkup && mentionsVisualAsset(question) && !/\d/.test(svgMarkup)) {
    warnings.push("SVG visual has no numeric labels; verify figure is complete before student use.");
  }
  return warnings;
}

function tableToMarkdown(table: ParsedQuestionExtraTable) {
  const rows = [table.headers, ...table.rows];
  const escapeCell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  const header = `| ${rows[0].map(escapeCell).join(" | ")} |`;
  const separator = `| ${rows[0].map(() => "---").join(" | ")} |`;
  const body = rows.slice(1).map((row) => `| ${row.map(escapeCell).join(" | ")} |`);
  return [table.title ? `Table title: ${table.title}` : null, header, separator, ...body].filter(Boolean).join("\n");
}

function mentionsVisualAsset(question: QuestionRow) {
  const text = [
    question.questionText,
    question.passage ?? "",
  ].join("\n");

  return [
    /\b(?:according to|based on|using|uses|from)\s+(?:the\s+)?(?:data\s+(?:in|from)\s+)?(?:table|graph|figure|chart|scatterplot|histogram|bar chart|box plot|dot plot|line graph|circle graph|pie chart|diagram)\b/i,
    /\b(?:table|graph|figure|chart|scatterplot|histogram|bar chart|box plot|dot plot|line graph|circle graph|pie chart|diagram)\s+(?:is\s+)?(?:shown|shows|provided|given|above|below)\b/i,
    /\b(?:shown|provided|given)\s+(?:in|by|on)\s+(?:the\s+)?(?:table|graph|figure|chart|scatterplot|histogram|bar chart|box plot|dot plot|line graph|circle graph|pie chart|diagram)\b/i,
    /\b(?:following|given)\s+(?:table|graph|figure|chart|scatterplot|histogram|bar chart|box plot|dot plot|line graph|circle graph|pie chart|diagram)\b/i,
    /\b(?:table|graph|scatterplot|histogram|bar chart|box plot|dot plot|line graph|circle graph|pie chart)\s+models\b/i,
    /\bdata\s+shown\s+in\s+(?:the\s+)?(?:table|graph|chart|scatterplot|histogram|bar chart|box plot|dot plot|line graph|circle graph|pie chart)\b/i,
    /\b(?:the\s+)?(?:two-way|relative frequency|frequency)?\s*table\s+(?:summarizes|represents|shows|gives|provides|lists|displays|contains)\b/i,
    /\b(?:the\s+)?(?:bar chart|bar graph|line graph|box plot|dot plot|histogram|pie chart|circle graph|scatterplot|scatter plot)\s+(?:summarizes|represents|shows|gives|provides|displays|models)\b/i,
    /\b(?:the\s+)?(?:accompanying|provided|given)\s+(?:table|graph|chart|scatterplot|scatter plot|histogram|bar chart|bar graph|line graph|box plot|dot plot|pie chart|circle graph)\b/i,
    /\b(?:which choice|which statement)\s+(?:best\s+)?(?:describes|uses|completes|supports)[^?]*(?:data|information)\s+(?:from|in)\s+(?:the\s+)?(?:table|graph|chart|scatterplot|scatter plot|histogram|bar chart|bar graph|line graph|box plot|dot plot)\b/i,
    /\b(?:student|researcher)\s+wants\s+to\s+use\s+data\s+from\s+(?:the\s+)?(?:table|graph|chart|scatterplot|scatter plot|histogram|bar chart|bar graph|line graph|box plot|dot plot)\b/i,
    /\b(?:information|data)\s+from\s+(?:the\s+)?(?:table|graph|chart|scatterplot|scatter plot|histogram|bar chart|bar graph|line graph|box plot|dot plot)\s+(?:suggests|shows|indicates|supports)\b/i,
    /\bas\s+(?:shown|illustrated)\s+in\s+(?:the\s+)?(?:table|graph|chart|scatterplot|scatter plot|histogram|bar chart|bar graph|line graph|box plot|dot plot)\b/i,
    /\baccording\s+to\s+(?:the\s+)?provided\s+data\b/i,
    /\b(?:which\s+of\s+the\s+following\s+)?graphs?\s+(?:represents|shows|models)\b/i,
    /\bwhich\s+of\s+the\s+following\s+scatterplots?\b/i,
    /\b(?:graph|scatterplot|scatter plot)\s+models\s+(?:the\s+)?(?:relationship|population|distance|height|weight|length|value|amount|number)\b/i,
    /\b(?:right\s+)?triangle\s+(?:is\s+)?shown\b/i,
    /\b(?:figure|diagram)\s+(?:is\s+)?not\s+drawn\s+to\s+scale\b/i,
    /\bline\s+segment\s+[A-Z]{2}\b/i,
  ].some((pattern) => pattern.test(text));
}

async function fetchTargetIds(pool: Pool) {
  if (args.retryFailedPath) {
    return readFailedIds(args.retryFailedPath);
  }

  if (args.ids) {
    return args.ids;
  }

  const visibilityJoin = args.publicOnly ? "join public.test_sections ts on ts.id = q.section_id join public.tests t on t.id = ts.test_id" : "";
  const visibilityWhere = args.publicOnly ? "where t.visibility = 'public'" : "";
  const orderClause = args.sample ? "order by random()" : "order by q.id";
  const limitClause = args.sample || args.limit ? "limit $1" : "";
  const limitValue = args.sample ?? args.limit;

  const sql = `
    select q.id
    from public.questions q
    ${visibilityJoin}
    ${visibilityWhere}
    ${orderClause}
    ${limitClause}
  `;
  const result = await pool.query<{ id: string }>(sql, limitValue ? [limitValue] : []);
  return result.rows.map((row) => row.id);
}

async function readFailedIds(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  const ids = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line) as { id?: string };
    if (parsed.id) ids.add(parsed.id);
  }
  return [...ids];
}

async function readCompletedIds(outputDir: string) {
  const filePath = path.join(outputDir, "evaluated.jsonl");
  if (!existsSync(filePath)) {
    return new Set<string>();
  }

  const raw = await readFile(filePath, "utf8");
  const ids = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line) as { id?: string; success?: boolean };
    if (parsed.id && parsed.success) ids.add(parsed.id);
  }
  return ids;
}

async function readCompletedIdsFrom(paths: string[]) {
  const completed = new Set<string>();
  for (const source of paths) {
    const filePath = source.endsWith(".jsonl") ? source : path.join(source, "evaluated.jsonl");
    if (!existsSync(filePath)) continue;
    const raw = await readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as { id?: string; success?: boolean };
      if (parsed.id && parsed.success) completed.add(parsed.id);
    }
  }
  return completed;
}

async function loadKnownIssues() {
  const issues = [...BUILTIN_KNOWN_ISSUES];
  if (args.knownIssuesJson) {
    const raw = await readFile(args.knownIssuesJson, "utf8");
    const parsed = JSON.parse(raw) as { issues?: KnownIssue[] } | KnownIssue[];
    const fileIssues = Array.isArray(parsed) ? parsed : parsed.issues ?? [];
    issues.push(...fileIssues);
  }

  knownIssuesById = new Map(issues.map((issue) => [issue.id, issue]));
}

async function fetchQuestion(pool: Pool | PoolClient, id: string): Promise<QuestionRow | null> {
  const result = await pool.query(
    `
      select
        q.id,
        q.legacy_mongo_id,
        q.section_id,
        q.position,
        q.question_type,
        q.question_text,
        q.passage,
        q.explanation,
        q.difficulty,
        q.points,
        q.domain,
        q.skill,
        q.image_url,
        q.extra,
        ts.name as section_name,
        ts.module_number,
        t.id as test_id,
        t.title as test_title,
        t.visibility as test_visibility,
        coalesce(options.options, '[]'::jsonb) as options,
        correct.correct_option,
        coalesce(spr.answers, '[]'::jsonb) as spr_answers
      from public.questions q
      join public.test_sections ts on ts.id = q.section_id
      join public.tests t on t.id = ts.test_id
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', qo.id,
            'optionCode', qo.option_code,
            'optionText', qo.option_text,
            'displayOrder', qo.display_order
          )
          order by qo.display_order
        ) as options
        from public.question_options qo
        where qo.question_id = q.id
      ) options on true
      left join lateral (
        select jsonb_build_object(
          'optionId', qo.id,
          'optionCode', qo.option_code,
          'optionText', qo.option_text,
          'displayOrder', qo.display_order
        ) as correct_option
        from public.question_correct_options qco
        join public.question_options qo on qo.id = qco.option_id
        where qco.question_id = q.id
      ) correct on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', qa.id,
            'acceptedAnswer', qa.accepted_answer,
            'displayOrder', qa.display_order
          )
          order by qa.display_order
        ) as answers
        from public.question_spr_accepted_answers qa
        where qa.question_id = q.id
      ) spr on true
      where q.id = $1
    `,
    [id],
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: String(row.id),
    legacyMongoId: row.legacy_mongo_id ? String(row.legacy_mongo_id) : null,
    sectionId: String(row.section_id),
    sectionName: String(row.section_name),
    moduleNumber: row.module_number === null ? null : Number(row.module_number),
    position: Number(row.position),
    questionType: row.question_type as QuestionType,
    questionText: String(row.question_text),
    passage: row.passage === null ? null : String(row.passage),
    explanation: String(row.explanation),
    difficulty: row.difficulty as QuestionDifficulty,
    points: Number(row.points),
    domain: row.domain === null ? null : String(row.domain),
    skill: row.skill === null ? null : String(row.skill),
    imageUrl: row.image_url === null ? null : String(row.image_url),
    extra: row.extra,
    testId: String(row.test_id),
    testTitle: String(row.test_title),
    testVisibility: String(row.test_visibility),
    options: (row.options as QuestionOption[]) ?? [],
    correctOption: (row.correct_option as CorrectOption) ?? null,
    sprAnswers: (row.spr_answers as SprAnswer[]) ?? [],
  };
}

async function fetchReplacementCandidates(pool: Pool, defective: QuestionRow, limit = 20) {
  const period = extractTestPeriod(defective.testTitle);
  const result = await pool.query<{ id: string }>(
    `
      select q.id
      from public.questions q
      join public.test_sections ts on ts.id = q.section_id
      join public.tests t on t.id = ts.test_id
      where q.id <> $1
        and q.question_type = $2
        and q.difficulty = $3
        and coalesce(q.domain, '') = coalesce($4, '')
        and coalesce(q.skill, '') = coalesce($5, '')
        and ts.name = $6
        and t.title <> $7
        and lower(t.title) not like $8
      order by random()
      limit $9
    `,
    [
      defective.id,
      defective.questionType,
      defective.difficulty,
      defective.domain,
      defective.skill,
      defective.sectionName,
      defective.testTitle,
      period ? `%${period.toLowerCase()}%` : "",
      limit,
    ],
  );

  return result.rows.map((row) => row.id);
}

function extractTestPeriod(title: string) {
  const yearMonth = title.match(/\b(20\d{2})\s+([A-Za-z]+)\b/);
  if (yearMonth) return `${yearMonth[1]} ${yearMonth[2]}`.toLowerCase();

  const monthYear = title.match(/\b([A-Za-z]+)\s+(20\d{2})\b/);
  if (monthYear) return `${monthYear[2]} ${monthYear[1]}`.toLowerCase();

  return "";
}

function buildBatchSolverPrompt(questions: QuestionRow[], solver: number) {
  return [
    "Return one compact JSON object in message.content.",
    "Solve every attached SAT question using only visible text plus parsed table data.",
    "Do not include explanations, derivations, markdown, notes, or extra fields.",
    "The solver payload intentionally excludes official answers and explanations. Do not infer missing table/graph/image data.",
    "The UI renders math through KaTeX. Use contentForRenderer.rendererText and mathSegments as display truth. Never rewrite LaTeX.",
    "Only extra table/SVG data is considered renderable visual content for this project. image_url is not renderable here.",
    "If a renderable SVG asset exists and you cannot interpret it, set needsVisualReview=true. Do not call it defective.",
    "If LaTeX is unreadable, set needsMathReview=true. Do not call it defective.",
    "Only report defectiveSignals for missing/broken source data, not for existing visual assets you cannot read.",
    "Return valid JSON only, with double-quoted keys and strings.",
    "Schema:",
    JSON.stringify({
      solver,
      results: [{
        questionId: "copy id from question",
        answer: {
          type: "multiple_choice|spr",
          optionCode: "A/B/C/D or stored option_code for multiple_choice",
          optionText: "exact choice text when useful",
          acceptedAnswer: "exact answer for spr",
          acceptedAnswers: ["reasonable equivalent SPR answers"],
        },
        confidence: 0.0,
        defectiveSignals: ["missing source data only"],
        needsVisualReview: false,
        needsMathReview: false,
      }],
    }),
    `Question count: ${questions.length}. Solver id: ${solver}.`,
  ].join("\n");
}

function buildBatchEvaluatorPrompt(questions: QuestionRow[], solverResults: SolverResult[]) {
  return [
    "Return one compact JSON object in message.content.",
    "Review attached question JSON plus solver outputs.",
    "Do not summarize, rewrite, explain, or add fields.",
    "This project does not render image_url. Only parsed extra tables and SVG extra content are usable visual assets.",
    "Existing SVG assets mean visual data exists. If text-only solvers cannot interpret it, set status needs_visual_review, not defective.",
    "KaTeX/math warnings mean status needs_math_review unless source data is independently missing or broken.",
    "Only set status defective for missing visual assets, bad extra payloads, impossible prompt data, or missing/impossible answer keys. Do not infer missing data.",
    "For valid questions, verify stored answer, taxonomy, difficulty, and point value. Use only this taxonomy:",
    JSON.stringify(SECTION_TAXONOMY),
    "Point rule: hard=10, medium=20, easy=30.",
    "Return valid JSON only, with double-quoted keys and strings.",
    "Keep notes short, 8 words or fewer.",
    "Schema:",
    JSON.stringify({
      results: [{
        questionId: "copy id from question",
        status: "valid|defective|needs_visual_review|needs_math_review",
        confidence: 0.0,
        defectiveReasons: ["reason strings"],
        needsVisualReview: false,
        needsMathReview: false,
        verifiedAnswer: {
          type: "multiple_choice|spr",
          optionCode: "A/B/C/D or stored option_code",
          optionText: "exact choice text when useful",
          acceptedAnswer: "exact answer for spr",
          acceptedAnswers: ["all reasonable accepted answer variants"],
        },
        taxonomy: {
          section: "Reading and Writing|Math",
          domain: "valid domain",
          skill: "valid skill",
        },
        difficulty: "easy|medium|hard",
        notes: "brief verification summary",
      }],
    }),
    `Question count: ${questions.length}. Solver result count: ${solverResults.length}.`,
  ].join("\n");
}

function buildSolverReasoningExtractionPrompt(questions: QuestionRow[], solver: number) {
  return [
    "Extract final solver answers from attached reasoning text.",
    "Do not solve again. Do not add derivations or explanations.",
    "If reasoning text has no explicit final answer for a question, leave optionCode/acceptedAnswer absent, confidence 0, and add a defectiveSignals reason.",
    "If reasoning text explicitly says no answer choice matches, confidence 0 and defectiveSignals must include no answer choice matches.",
    "Return valid JSON only in message.content.",
    "Schema:",
    JSON.stringify({
      solver,
      results: [{
        questionId: "copy id from question",
        answer: {
          type: "multiple_choice|spr",
          optionCode: "A/B/C/D/null for multiple_choice",
          acceptedAnswer: "SPR answer when explicit",
          acceptedAnswers: ["SPR variants when explicit"],
        },
        confidence: 0.0,
        defectiveSignals: ["reason when unresolved"],
        needsVisualReview: false,
        needsMathReview: false,
      }],
    }),
    `Question count: ${questions.length}.`,
  ].join("\n");
}

function buildEvaluatorReasoningExtractionPrompt(questions: QuestionRow[]) {
  return [
    "Extract final evaluator statuses from attached reasoning text.",
    "Do not re-evaluate, solve, or explain.",
    "If reasoning text has no explicit final status for a question, return status needs_math_review, confidence 0, and a no-content reason.",
    "Return valid JSON only in message.content.",
    "Schema:",
    JSON.stringify({
      results: [{
        questionId: "copy id from question",
        status: "valid|defective|needs_visual_review|needs_math_review",
        confidence: 0.0,
        defectiveReasons: ["reason strings"],
        needsVisualReview: false,
        needsMathReview: false,
        verifiedAnswer: {
          type: "multiple_choice|spr",
          optionCode: "A/B/C/D/null for multiple_choice",
          acceptedAnswer: "SPR answer when explicit",
          acceptedAnswers: ["SPR variants when explicit"],
        },
        taxonomy: {
          section: "Reading and Writing|Math",
          domain: "valid domain when explicit",
          skill: "valid skill when explicit",
        },
        difficulty: "easy|medium|hard",
        notes: "short extraction note",
      }],
    }),
    `Question count: ${questions.length}.`,
  ].join("\n");
}

async function runOpencodeJson<T>(
  model: string,
  prompt: string,
  payload: unknown,
  label: string,
  meta: Record<string, unknown> = {},
): Promise<T> {
  if (args.llmProvider === "openai") {
    return runOpenAiCompatJson<T>(model, prompt, payload, label, meta);
  }

  const semaphore = meta.llmPhase === "solver" ? solverLlmSemaphore : evaluatorLlmSemaphore;
  return semaphore.run(async () => {
    const tempRoot = path.join(process.cwd(), ".question-eval-tmp");
    await mkdir(tempRoot, { recursive: true });
    const tempDir = await mkdtemp(path.join(tempRoot, "run-"));
    const payloadPath = path.join(tempDir, "payload.json");
    await writeFile(payloadPath, JSON.stringify(payload, null, 2), "utf8");
    const startedAt = Date.now();
    await logger.write("llm-start.jsonl", { label, model, ...meta });

    try {
      const opencode = getOpencodeInvocation();
      const output = await runCommand(
        opencode.command,
        [...opencode.prefixArgs, "run", "-m", model, "--agent", args.opencodeAgent, "--pure", "--format", "json", prompt, `--file=${payloadPath}`],
        args.llmTimeoutMs,
        label,
      );
      const parsed = parseOpencodeJsonOutput<T>(output);
      await logger.write("llm-finish.jsonl", { label, model, durationMs: Date.now() - startedAt, success: true, ...meta });
      return parsed;
    } catch (error) {
      await logger.write("llm-finish.jsonl", {
        label,
        model,
        durationMs: Date.now() - startedAt,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        ...meta,
      });
      throw error;
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
}

async function runOpenAiCompatJson<T>(
  model: string,
  prompt: string,
  payload: unknown,
  label: string,
  meta: Record<string, unknown> = {},
): Promise<T> {
  const semaphore = meta.llmPhase === "solver" ? solverLlmSemaphore : evaluatorLlmSemaphore;
  return semaphore.run(async () => {
    const startedAt = Date.now();

    try {
      const apiKey = getRequiredEnv(args.openaiApiKeyEnv);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), args.llmTimeoutMs);
      const endpoint = `${args.openaiBaseUrl.replace(/\/+$/, "")}/chat/completions`;
      const payloadText = JSON.stringify(payload);
      const userContent = `${prompt}\n\nAttached question JSON:\n${payloadText}`;
      const maxTokens = meta.llmPhase === "solver" ? args.maxSolverTokens : args.maxEvaluatorTokens;
      const disableThinkingParams = args.openaiDisableThinking
        ? {
            reasoning_effort: "none",
            thinking_mode: "non-think",
            include_reasoning: false,
            enable_thinking: false,
            chat_template_kwargs: {
              thinking: false,
              enable_thinking: false,
            },
          }
        : {};
      const body: Record<string, unknown> = {
        model,
        messages: [
          {
            role: "system",
            content: "Return valid JSON only in message.content. No markdown, prose, notes, or explanations.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        ...disableThinkingParams,
      };
      const bodyText = JSON.stringify(body);
      const payloadStats = summarizeLlmPayload({
        prompt,
        payloadText,
        userContent,
        bodyText,
        payload,
      });
      await logger.write("llm-start.jsonl", {
        label,
        model,
        provider: "openai",
        maxTokens,
        disableThinking: args.openaiDisableThinking,
        requestOptions: summarizeOpenAiRequestOptions(body),
        payloadBytes: payloadStats.payloadBytes,
        bodyBytes: payloadStats.bodyBytes,
        estimatedInputTokens: payloadStats.estimatedInputTokens,
        questionPayloads: payloadStats.questionPayloads,
        sentAt: new Date().toISOString(),
        ...meta,
      });
      await logger.write("llm-payload.jsonl", {
        label,
        model,
        provider: "openai",
        maxTokens,
        disableThinking: args.openaiDisableThinking,
        requestOptions: summarizeOpenAiRequestOptions(body),
        ...payloadStats,
        ...meta,
      });

      const apiRequestAt = new Date().toISOString();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: bodyText,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      const apiResponseAt = new Date().toISOString();

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`${label} failed with HTTP ${response.status}: ${responseText.slice(0, 1000)}`);
      }

      const responseBody = JSON.parse(responseText) as {
        choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>;
        usage?: Record<string, unknown>;
      };
      const choice = responseBody.choices?.[0];
      const message = choice?.message;
      const content = message?.content;
      if (!content) {
        const reasoningContent = message?.reasoning_content ?? "";
        if (reasoningContent) {
          try {
            const parsed = parseJsonFromText<T>(reasoningContent);
            await logger.write("llm-reasoning-content-recovered.jsonl", {
              label,
              model,
              provider: "openai",
              reasoningBytes: byteLength(reasoningContent),
              reasoningPreview: previewForLog(reasoningContent),
              usage: responseBody.usage ?? null,
              finishReason: choice?.finish_reason ?? null,
              apiRequestAt,
              apiResponseAt,
              durationMs: Date.now() - startedAt,
              ...meta,
            });
            await logger.write("llm-finish.jsonl", {
              label,
              model,
              provider: "openai",
              durationMs: Date.now() - startedAt,
              success: true,
              recoveredFromReasoningContent: true,
              responseBytes: byteLength(responseText),
              contentBytes: 0,
              reasoningBytes: byteLength(reasoningContent),
              usage: responseBody.usage ?? null,
              finishReason: choice?.finish_reason ?? null,
              apiRequestAt,
              apiResponseAt,
              ...meta,
            });
            return parsed;
          } catch {
            // Fall through to the normal no-content failure path.
          }
        }
        await logger.write("llm-response-empty.jsonl", {
          label,
          model,
          provider: "openai",
          hasReasoningContent: Boolean(message?.reasoning_content),
          reasoningBytes: byteLength(reasoningContent),
          reasoningPreview: previewForLog(reasoningContent),
          usage: responseBody.usage ?? null,
          finishReason: choice?.finish_reason ?? null,
          apiRequestAt,
          apiResponseAt,
          durationMs: Date.now() - startedAt,
          ...meta,
        });
        throw new NoContentModelOutputError(`${label} returned no message content.`, {
          label,
          model,
          provider: "openai",
          hasReasoningContent: Boolean(message?.reasoning_content),
          reasoningBytes: byteLength(reasoningContent),
          finishReason: choice?.finish_reason ?? null,
          durationMs: Date.now() - startedAt,
        }, reasoningContent);
      }

      let parsed: T;
      try {
        parsed = parseJsonFromText<T>(content);
      } catch (parseError) {
        await logger.write("llm-malformed-json.jsonl", {
          label,
          model,
          provider: "openai",
          contentBytes: byteLength(content),
          contentPreview: previewForLog(content),
          usage: responseBody.usage ?? null,
          finishReason: choice?.finish_reason ?? null,
          apiRequestAt,
          apiResponseAt,
          durationMs: Date.now() - startedAt,
          parseError: parseError instanceof Error ? parseError.message.slice(0, 300) : String(parseError).slice(0, 300),
          ...meta,
        });
        throw new MalformedModelOutputError(`${label} returned malformed JSON.`, {
          label,
          model,
          provider: "openai",
          contentBytes: byteLength(content),
          finishReason: choice?.finish_reason ?? null,
          durationMs: Date.now() - startedAt,
        }, content);
      }
      await logger.write("llm-finish.jsonl", {
        label,
        model,
        provider: "openai",
        durationMs: Date.now() - startedAt,
        success: true,
        responseBytes: byteLength(responseText),
        contentBytes: byteLength(content),
        usage: responseBody.usage ?? null,
        finishReason: choice?.finish_reason ?? null,
        apiRequestAt,
        apiResponseAt,
        ...meta,
      });
      return parsed;
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? `${label} timed out after ${args.llmTimeoutMs}ms`
        : error instanceof Error ? error.message : String(error);
      await logger.write("llm-finish.jsonl", {
        label,
        model,
        provider: "openai",
        durationMs: Date.now() - startedAt,
        success: false,
        error: message,
        ...meta,
      });
      if (error instanceof NoContentModelOutputError || error instanceof MalformedModelOutputError) {
        throw error;
      }
      if (error instanceof MalformedModelOutputError) {
        throw error;
      }
      throw new Error(message);
    }
  });
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function estimatedTokensFromBytes(bytes: number) {
  return Math.ceil(bytes / 4);
}

function previewForLog(value: string, limit = 300) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function summarizeOpenAiRequestOptions(body: Record<string, unknown>) {
  return {
    responseFormat: body.response_format ?? null,
    reasoningEffort: body.reasoning_effort ?? null,
    thinkingMode: body.thinking_mode ?? null,
    includeReasoning: body.include_reasoning ?? null,
    enableThinking: body.enable_thinking ?? null,
    chatTemplateKwargs: body.chat_template_kwargs ?? null,
  };
}

function summarizeLlmPayload(input: {
  prompt: string;
  payloadText: string;
  userContent: string;
  bodyText: string;
  payload: unknown;
}) {
  const promptBytes = byteLength(input.prompt);
  const payloadBytes = byteLength(input.payloadText);
  const userContentBytes = byteLength(input.userContent);
  const bodyBytes = byteLength(input.bodyText);
  return {
    promptBytes,
    payloadBytes,
    userContentBytes,
    bodyBytes,
    estimatedInputTokens: estimatedTokensFromBytes(userContentBytes),
    questionPayloads: extractQuestionPayloadStats(input.payload),
  };
}

function extractQuestionPayloadStats(payload: unknown) {
  const source = payload && typeof payload === "object" ? payload as { questions?: unknown } : {};
  const questions = Array.isArray(source.questions) ? source.questions : [];
  return questions.map((question) => {
    const q = question && typeof question === "object" ? question as Record<string, unknown> : {};
    const contentForRenderer = q.contentForRenderer && typeof q.contentForRenderer === "object"
      ? q.contentForRenderer as Record<string, unknown>
      : {};
    const sourceContent = q.sourceContent && typeof q.sourceContent === "object"
      ? q.sourceContent as Record<string, unknown>
      : {};
    return {
      id: typeof q.id === "string" ? q.id : null,
      totalBytes: byteLength(JSON.stringify(q)),
      questionTextBytes: byteLength(String(sourceContent.questionText ?? "")),
      passageBytes: byteLength(String(sourceContent.passage ?? "")),
      choicesBytes: byteLength(JSON.stringify(q.choices ?? [])),
      rendererBytes: byteLength(JSON.stringify(contentForRenderer)),
      extraBytes: byteLength(JSON.stringify(q.extra ?? null)),
      assetAnalysisBytes: byteLength(JSON.stringify(q.assetAnalysis ?? null)),
    };
  });
}

function getOpencodeInvocation() {
  const binLower = args.opencodeBin.toLowerCase();
  if (process.platform === "win32" && (binLower.endsWith("opencode.cmd") || binLower.endsWith("opencode.ps1"))) {
    const basedir = path.dirname(args.opencodeBin);
    const nodePath = path.join(basedir, "node.exe");
    const opencodeScript = path.join(basedir, "node_modules", "opencode-ai", "bin", "opencode");
    if (existsSync(nodePath) && existsSync(opencodeScript)) {
      return { command: nodePath, prefixArgs: [opencodeScript] };
    }
  }

  return { command: args.opencodeBin, prefixArgs: [] };
}

function runCommand(command: string, commandArgs: string[], timeoutMs: number, label: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      windowsHide: true,
      env: process.env,
    });
    child.stdin?.end();
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      killProcessTree(child.pid);
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}: ${stripAnsi(stderr || stdout).slice(0, 1000)}`));
    });
  });
}

function killProcessTree(pid: number | undefined) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }).on("error", () => undefined);
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ignore best-effort cleanup failures; caller already returns timeout failure.
  }
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function parseOpencodeJsonOutput<T>(output: string): T {
  let text = "";
  for (const line of output.split(/\r?\n/)) {
    const clean = stripAnsi(line).trim();
    if (!clean) continue;

    try {
      const event = JSON.parse(clean) as { type?: string; part?: { type?: string; text?: string } };
      if (event.type === "text" && event.part?.type === "text" && typeof event.part.text === "string") {
        text += event.part.text;
      }
    } catch {
      text += clean;
    }
  }

  return parseJsonFromText<T>(text);
}

function parseJsonFromText<T>(text: string): T {
  const cleaned = stripAnsi(text)
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)) as T;
    }

    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1)) as T;
    }
  }

  throw new Error(`Could not parse JSON from model output: ${cleaned.slice(0, 1000)}`);
}

function isEvaluatorFallbackError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /HTTP 5\d\d|timed out|timeout|AbortError|Could not parse JSON|malformed/i.test(message);
}

function normalizeSolverResult(raw: Partial<SolverResult>, question: QuestionRow, solver: number): SolverResult {
  return {
    solver,
    questionId: typeof raw.questionId === "string" ? raw.questionId : question.id,
    answer: normalizeAnswer(raw.answer, question),
    confidence: normalizeConfidence(raw.confidence),
    defectiveSignals: Array.isArray(raw.defectiveSignals) ? raw.defectiveSignals.map(String).filter(Boolean) : [],
    needsVisualReview: Boolean(raw.needsVisualReview),
    needsMathReview: Boolean(raw.needsMathReview),
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
  };
}

function normalizeEvaluatorResult(raw: Partial<EvaluatorResult>, question: QuestionRow): EvaluatorResult {
  const statusText = String(raw.status ?? "").toLowerCase();
  const status: EvalStatus = statusText === "defective"
    ? "defective"
    : statusText === "needs_visual_review" || statusText === "needsvisualreview"
      ? "needs_visual_review"
      : statusText === "needs_math_review" || statusText === "needsmathreview"
        ? "needs_math_review"
        : "valid";
  return {
    questionId: typeof raw.questionId === "string" ? raw.questionId : question.id,
    status,
    confidence: normalizeConfidence(raw.confidence),
    defectiveReasons: Array.isArray(raw.defectiveReasons) ? raw.defectiveReasons.map(String).filter(Boolean) : [],
    verifiedAnswer: raw.verifiedAnswer ? normalizeAnswer(raw.verifiedAnswer, question) : undefined,
    taxonomy: raw.taxonomy
      ? {
          section: String(raw.taxonomy.section ?? normalizeSectionName(question.sectionName)),
          domain: String(raw.taxonomy.domain ?? ""),
          skill: String(raw.taxonomy.skill ?? ""),
        }
      : undefined,
    difficulty: isQuestionDifficulty(raw.difficulty) ? raw.difficulty : question.difficulty,
    needsVisualReview: Boolean(raw.needsVisualReview),
    needsMathReview: Boolean(raw.needsMathReview),
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
  };
}

function normalizeAnswer(rawAnswer: unknown, question: QuestionRow): SolverResult["answer"] {
  const raw = rawAnswer && typeof rawAnswer === "object" ? rawAnswer as Record<string, unknown> : {};
  const type = raw.type === "spr" || question.questionType === "spr" ? "spr" : "multiple_choice";
  if (type === "spr") {
    const acceptedAnswers = Array.isArray(raw.acceptedAnswers)
      ? raw.acceptedAnswers.map(String).filter(Boolean)
      : typeof raw.acceptedAnswer === "string"
        ? [raw.acceptedAnswer]
        : [];
    return {
      type,
      acceptedAnswer: typeof raw.acceptedAnswer === "string" ? raw.acceptedAnswer : acceptedAnswers[0],
      acceptedAnswers,
    };
  }

  return {
    type,
    optionCode: typeof raw.optionCode === "string" ? raw.optionCode : undefined,
    optionText: typeof raw.optionText === "string" ? raw.optionText : undefined,
  };
}

function normalizeConfidence(value: unknown) {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function getBatchResults<T extends { questionId?: string }>(raw: unknown): T[] {
  if (Array.isArray(raw)) {
    return raw as T[];
  }

  if (raw && typeof raw === "object" && Array.isArray((raw as { results?: unknown }).results)) {
    return (raw as { results: T[] }).results;
  }

  throw new Error("Model output must be an array or an object with a results array.");
}

function hasCompleteSolverResults(results: SolverResult[] | undefined): results is SolverResult[] {
  if (!results || results.length !== 3) return false;
  const solvers = new Set(results.map((result) => result.solver));
  return solvers.has(1) && solvers.has(2) && solvers.has(3);
}

function compactSolverResultsForEvaluator(results: SolverResult[]) {
  return results.map((result) => ({
    solver: result.solver,
    questionId: result.questionId,
    answer: result.answer,
    confidence: result.confidence,
    defectiveSignals: result.defectiveSignals,
    needsVisualReview: Boolean(result.needsVisualReview),
    needsMathReview: Boolean(result.needsMathReview),
  }));
}

function buildNoContentSolverResults(questions: QuestionRow[], solver: number, error: NoContentModelOutputError): SolverResult[] {
  return questions.map((question) => ({
    solver,
    questionId: question.id,
    answer: normalizeAnswer(null, question),
    confidence: 0,
    defectiveSignals: [
      `Solver returned no JSON content (${error.details.finishReason ?? "unknown finish reason"}); manual review required.`,
    ],
    needsVisualReview: false,
    needsMathReview: normalizeSectionName(question.sectionName) === "Math",
    reasoning: "",
  }));
}

function buildMalformedSolverResults(questions: QuestionRow[], solver: number, error: MalformedModelOutputError): SolverResult[] {
  return questions.map((question) => ({
    solver,
    questionId: question.id,
    answer: normalizeAnswer(null, question),
    confidence: 0,
    defectiveSignals: [
      `Solver returned malformed JSON (${error.details.finishReason ?? "unknown finish reason"}); manual review required.`,
    ],
    needsVisualReview: false,
    needsMathReview: normalizeSectionName(question.sectionName) === "Math",
    reasoning: "",
  }));
}

function buildReasoningExtractionQuestionPayload(question: QuestionRow) {
  return {
    id: question.id,
    questionType: question.questionType,
    sectionName: normalizeSectionName(question.sectionName),
    choices: question.options.map((option) => ({
      optionCode: option.optionCode,
      optionText: option.optionText,
    })),
  };
}

function truncateReasoningForExtraction(value: string) {
  return value.length > 16000 ? value.slice(0, 16000) : value;
}

async function recoverSolverResultsFromText(
  questions: QuestionRow[],
  solver: number,
  sourceText: string,
  sourceKind: "reasoning_content" | "malformed_content",
  batchIds: string[],
  splitDepth: number,
) {
  if (!sourceText.trim()) {
    return null;
  }

  try {
    const raw = await runOpencodeJson<unknown>(
      args.solverModel,
      buildSolverReasoningExtractionPrompt(questions, solver),
      {
        questions: questions.map(buildReasoningExtractionQuestionPayload),
        reasoningText: truncateReasoningForExtraction(sourceText),
      },
      `solver ${solver} ${sourceKind} extractor batch(${questions.length})`,
      { solver, batchIds, splitDepth, llmPhase: "solver", recovery: sourceKind },
    );
    const rawResults = getBatchResults<Partial<SolverResult>>(raw);
    const recovered = questions.map((question) => {
      const rawQuestionResult = rawResults.find((result) => result.questionId === question.id) ?? {};
      return normalizeSolverResult(rawQuestionResult, question, solver);
    });
    await logger.write("reasoning-extraction.jsonl", {
      phase: "solver",
      solver,
      batchIds,
      splitDepth,
      sourceKind,
      success: true,
      recovered: recovered.map((result) => ({
        questionId: result.questionId,
        confidence: result.confidence,
        answer: result.answer,
        defectiveSignals: result.defectiveSignals,
      })),
    });
    return recovered;
  } catch (recoveryError) {
    await logger.write("reasoning-extraction.jsonl", {
      phase: "solver",
      solver,
      batchIds,
      splitDepth,
      sourceKind,
      success: false,
      error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
    });
    return null;
  }
}

function buildNoContentEvaluatorResult(question: QuestionRow, error: NoContentModelOutputError): EvaluatorResult {
  return {
    questionId: question.id,
    status: "needs_math_review",
    confidence: 0,
    defectiveReasons: [
      `Evaluator returned no JSON content (${error.details.finishReason ?? "unknown finish reason"}); manual review required.`,
    ],
    verifiedAnswer: normalizeAnswer(buildOfficialAnswer(question), question),
    taxonomy: {
      section: normalizeSectionName(question.sectionName),
      domain: question.domain ?? "",
      skill: question.skill ?? "",
    },
    difficulty: question.difficulty,
    needsVisualReview: false,
    needsMathReview: true,
    notes: "LLM no-content fallback",
  };
}

function buildMalformedEvaluatorResult(question: QuestionRow, error: MalformedModelOutputError): EvaluatorResult {
  return {
    questionId: question.id,
    status: "needs_math_review",
    confidence: 0,
    defectiveReasons: [
      `Evaluator returned malformed JSON (${error.details.finishReason ?? "unknown finish reason"}); manual review required.`,
    ],
    verifiedAnswer: normalizeAnswer(buildOfficialAnswer(question), question),
    taxonomy: {
      section: normalizeSectionName(question.sectionName),
      domain: question.domain ?? "",
      skill: question.skill ?? "",
    },
    difficulty: question.difficulty,
    needsVisualReview: false,
    needsMathReview: true,
    notes: "LLM malformed fallback",
  };
}

async function recoverEvaluatorResultsFromText(
  questions: QuestionRow[],
  sourceText: string,
  sourceKind: "reasoning_content" | "malformed_content",
  batchIds: string[],
  splitDepth: number,
) {
  if (!sourceText.trim()) {
    return null;
  }

  try {
    const raw = await runOpencodeJson<unknown>(
      args.solverModel,
      buildEvaluatorReasoningExtractionPrompt(questions),
      {
        questions: questions.map(buildReasoningExtractionQuestionPayload),
        reasoningText: truncateReasoningForExtraction(sourceText),
      },
      `evaluator ${sourceKind} extractor batch(${questions.length})`,
      { batchIds, splitDepth, llmPhase: "solver", recovery: sourceKind, primaryEvaluatorModel: args.evaluatorModel },
    );
    const rawResults = getBatchResults<Partial<EvaluatorResult>>(raw);
    await logger.write("reasoning-extraction.jsonl", {
      phase: "evaluator",
      batchIds,
      splitDepth,
      sourceKind,
      extractorModel: args.solverModel,
      primaryEvaluatorModel: args.evaluatorModel,
      success: true,
      recovered: rawResults.map((result) => ({
        questionId: result.questionId,
        status: result.status,
        confidence: result.confidence,
      })),
    });
    return raw;
  } catch (recoveryError) {
    await logger.write("reasoning-extraction.jsonl", {
      phase: "evaluator",
      batchIds,
      splitDepth,
      sourceKind,
      extractorModel: args.solverModel,
      primaryEvaluatorModel: args.evaluatorModel,
      success: false,
      error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
    });
    return null;
  }
}

async function runSolverForQuestionSubset(
  questions: QuestionRow[],
  analyses: Map<string, QuestionAssetAnalysis>,
  solver: number,
  splitDepth: number,
  solverSplitDepth = 0,
): Promise<SolverResult[]> {
  const solverBatchPayload = {
    questions: questions.map((question) =>
      buildQuestionPayload(question, analyses.get(question.id), { includeAnswerAndExplanation: false })
    ),
  };
  const batchIds = questions.map((question) => question.id);

  try {
    const raw = await retry(() =>
      runOpencodeJson<unknown>(
        args.solverModel,
        buildBatchSolverPrompt(questions, solver),
        solverBatchPayload,
        `solver ${solver} batch(${questions.length})`,
        { solver, batchIds, splitDepth, solverSplitDepth, llmPhase: "solver" },
      ),
    );
    const rawResults = getBatchResults<Partial<SolverResult>>(raw);
    return questions.map((question) => {
      const rawQuestionResult = rawResults.find((result) => result.questionId === question.id) ?? {};
      return normalizeSolverResult(rawQuestionResult, question, solver);
    });
  } catch (error) {
    if (
      (error instanceof NoContentModelOutputError || error instanceof MalformedModelOutputError) &&
      questions.length > 1
    ) {
      const midpoint = Math.ceil(questions.length / 2);
      const left = questions.slice(0, midpoint);
      const right = questions.slice(midpoint);
      await logger.write("solver-batch-splits.jsonl", {
        solver,
        splitDepth,
        solverSplitDepth,
        size: questions.length,
        left: left.map((question) => question.id),
        right: right.map((question) => question.id),
        error: error.message,
        errorType: error.name,
      });
      const leftResults = await runSolverForQuestionSubset(left, analyses, solver, splitDepth, solverSplitDepth + 1);
      const rightResults = await runSolverForQuestionSubset(right, analyses, solver, splitDepth, solverSplitDepth + 1);
      return [...leftResults, ...rightResults];
    }

    if (error instanceof NoContentModelOutputError) {
      await logger.write("solver-no-content-placeholder.jsonl", {
        solver,
        batchIds,
        splitDepth,
        solverSplitDepth,
        error: error.message,
        details: error.details,
      });
      const recovered = await recoverSolverResultsFromText(questions, solver, error.reasoningContent, "reasoning_content", batchIds, splitDepth);
      return recovered ?? buildNoContentSolverResults(questions, solver, error);
    }

    if (error instanceof MalformedModelOutputError) {
      await logger.write("solver-malformed-placeholder.jsonl", {
        solver,
        batchIds,
        splitDepth,
        solverSplitDepth,
        error: error.message,
        details: error.details,
      });
      const recovered = await recoverSolverResultsFromText(questions, solver, error.outputText, "malformed_content", batchIds, splitDepth);
      return recovered ?? buildMalformedSolverResults(questions, solver, error);
    }

    throw error;
  }
}

async function getSolverResultsForBatch(
  questions: QuestionRow[],
  analyses: Map<string, QuestionAssetAnalysis>,
  splitDepth: number,
  solverCache: SolverResultCache,
) {
  const cachedResults: SolverResult[] = [];
  const uncachedQuestions: QuestionRow[] = [];

  for (const question of questions) {
    const cached = solverCache.get(question.id);
    if (hasCompleteSolverResults(cached)) {
      cachedResults.push(...cached);
      await logger.write("solver-cache.jsonl", {
        message: `Using cached Flash results for question ${question.id}`,
        id: question.id,
        splitDepth,
        solvers: cached.map((result) => result.solver),
      });
    } else {
      uncachedQuestions.push(question);
    }
  }

  if (uncachedQuestions.length === 0) {
    return cachedResults;
  }

  const batchIds = uncachedQuestions.map((question) => question.id);
  const solverSettled = await Promise.allSettled(
    [1, 2, 3].map((solver) => runSolverForQuestionSubset(uncachedQuestions, analyses, solver, splitDepth)),
  );
  const solverFailures = solverSettled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (solverFailures.length > 0) {
    throw new Error(
      `Solver failures for batch ${batchIds.join(",")}: ${solverFailures
        .map((failure) => failure.reason instanceof Error ? failure.reason.message : String(failure.reason))
        .join(" | ")}`,
    );
  }

  const freshResults = solverSettled.flatMap((result) => (result as PromiseFulfilledResult<SolverResult[]>).value);
  for (const question of uncachedQuestions) {
    const questionResults = freshResults.filter((result) => result.questionId === question.id);
    if (hasCompleteSolverResults(questionResults)) {
      solverCache.set(question.id, questionResults);
      await logger.write("solver-cache.jsonl", {
        message: `Stored Flash results for question ${question.id}`,
        id: question.id,
        splitDepth,
        solvers: questionResults.map((result) => result.solver),
      });
    }
  }

  return [...cachedResults, ...freshResults];
}

async function retryEvaluator<T>(
  task: (attempt: number) => Promise<T>,
  meta: Record<string, unknown>,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= args.evaluatorMaxAttempts; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= args.evaluatorMaxAttempts || !isEvaluatorRetryableError(error)) {
        break;
      }
      await logger.write("evaluator-retry.jsonl", {
        ...meta,
        attempt,
        nextAttempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(1000 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function isEvaluatorRetryableError(error: unknown) {
  if (error instanceof NoContentModelOutputError || error instanceof MalformedModelOutputError) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /HTTP 5\d\d|timed out|timeout|AbortError|fetch failed|ECONNRESET|ETIMEDOUT/i.test(message);
}

async function evaluateQuestionBatch(
  questions: QuestionRow[],
  allowReplacement: boolean,
  splitDepth = 0,
  solverCache: SolverResultCache = new Map(),
): Promise<EvaluationOutcome[]> {
  const analyses = new Map(questions.map((question) => [question.id, analyzeQuestionAssets(question)]));
  const evaluatorQuestionsPayload = {
    questions: questions.map((question) => buildQuestionPayload(question, analyses.get(question.id), { includeAnswerAndExplanation: true })),
  };
  const batchIds = questions.map((question) => question.id);
  const solverResults = await getSolverResultsForBatch(questions, analyses, splitDepth, solverCache);

  const evaluatorPayload = {
    questions: evaluatorQuestionsPayload.questions,
    solvers: compactSolverResultsForEvaluator(solverResults),
  };
  const evaluatorPrompt = buildBatchEvaluatorPrompt(questions, solverResults);
  let evaluatorFallback = false;
  let rawEvaluator: unknown;
  try {
    rawEvaluator = await retryEvaluator((attempt) =>
      runOpencodeJson<unknown>(
        args.evaluatorModel,
        evaluatorPrompt,
        evaluatorPayload,
        `evaluator batch(${questions.length})`,
        { batchIds, splitDepth, evaluatorAttempt: attempt, llmPhase: "evaluator" },
      ),
      { batchIds, splitDepth, model: args.evaluatorModel, label: `evaluator batch(${questions.length})` },
    );
  } catch (error) {
    if (error instanceof NoContentModelOutputError) {
      await logger.write("evaluator-no-content-fallback.jsonl", {
        batchIds,
        splitDepth,
        model: args.evaluatorModel,
        error: error.message,
        details: error.details,
      });
      rawEvaluator = await recoverEvaluatorResultsFromText(questions, error.reasoningContent, "reasoning_content", batchIds, splitDepth)
        ?? {
          results: questions.map((question) => buildNoContentEvaluatorResult(question, error)),
        };
    } else if (error instanceof MalformedModelOutputError) {
      await logger.write("evaluator-malformed-fallback.jsonl", {
        batchIds,
        splitDepth,
        model: args.evaluatorModel,
        error: error.message,
        details: error.details,
      });
      rawEvaluator = await recoverEvaluatorResultsFromText(questions, error.outputText, "malformed_content", batchIds, splitDepth)
        ?? {
          results: questions.map((question) => buildMalformedEvaluatorResult(question, error)),
        };
    } else {
      if (!args.evaluatorFallbackModel || !isEvaluatorFallbackError(error)) {
        throw error;
      }

      evaluatorFallback = true;
      await logger.write("evaluator-fallback.jsonl", {
        batchIds,
        splitDepth,
        primaryModel: args.evaluatorModel,
        fallbackModel: args.evaluatorFallbackModel,
        error: error instanceof Error ? error.message : String(error),
      });
      rawEvaluator = await retryEvaluator((attempt) =>
        runOpencodeJson<unknown>(
          args.evaluatorFallbackModel as string,
          evaluatorPrompt,
          evaluatorPayload,
          `evaluator fallback batch(${questions.length})`,
          { batchIds, splitDepth, evaluatorFallback: true, evaluatorAttempt: attempt, llmPhase: "evaluator" },
        ),
        { batchIds, splitDepth, model: args.evaluatorFallbackModel, label: `evaluator fallback batch(${questions.length})` },
      );
    }
  }
  const rawEvaluatorResults = getBatchResults<Partial<EvaluatorResult>>(rawEvaluator);
  const outcomes = questions.map((question) => {
    const assetAnalysis = analyses.get(question.id) ?? analyzeQuestionAssets(question);
    const rawQuestionEvaluator = rawEvaluatorResults.find((result) => result.questionId === question.id) ?? {};
    const evaluator = enforceSafetyStatus(normalizeEvaluatorResult(rawQuestionEvaluator, question), assetAnalysis);
    const questionSolverResults = solverResults.filter((result) => result.questionId === question.id);

    if (evaluator.status === "defective" && evaluator.defectiveReasons.length === 0) {
      evaluator.defectiveReasons.push("Evaluator marked defective without detailed reason.");
    }

    return {
      question,
      assetAnalysis,
      solverResults: questionSolverResults,
      evaluator,
    };
  });

  await logger.write("evaluations.raw.jsonl", {
    batchIds,
    allowReplacement,
    evaluatorFallback,
    solverResults,
    evaluatorResults: outcomes.map((outcome) => outcome.evaluator),
  });
  await logger.write("batch-results.jsonl", {
    batchIds,
    statuses: outcomes.map((outcome) => ({ id: outcome.question.id, status: outcome.evaluator.status })),
  });

  return outcomes;
}

function isFastDefectiveVisualState(visualState: VisualAssetState) {
  return visualState === "missing_visual" || visualState === "bad_extra";
}

function isExistingVisualReviewState(visualState: VisualAssetState) {
  return visualState === "svg_visual" || visualState === "image_visual";
}

function buildFastVisualOutcome(question: QuestionRow, assetAnalysis: QuestionAssetAnalysis): EvaluationOutcome {
  if (isFastDefectiveVisualState(assetAnalysis.visualState)) {
    return {
      question,
      assetAnalysis,
      solverResults: [],
      fastPath: "defective_visual",
      evaluator: {
        questionId: question.id,
        status: "defective",
        confidence: 1,
        defectiveReasons: [
          assetAnalysis.visualState === "missing_visual"
            ? "Fast path: prompt appears to require a visual/table asset, but no valid visual/table asset exists."
            : `Fast path: extra payload is structurally broken${assetAnalysis.badExtraReason ? ` (${assetAnalysis.badExtraReason})` : ""}.`,
        ],
        needsVisualReview: false,
        needsMathReview: false,
        difficulty: question.difficulty,
        notes: "Skipped LLM evaluation because deterministic visual gate marked this as true defective visual source data.",
      },
    };
  }

  return {
    question,
    assetAnalysis,
    solverResults: [],
    fastPath: "visual_review",
    evaluator: {
      questionId: question.id,
      status: "needs_visual_review",
      confidence: 1,
      defectiveReasons: [
        `Fast path: ${assetAnalysis.visualState} exists and requires manual visual review, not automated replacement.`,
      ],
      needsVisualReview: true,
      needsMathReview: false,
      difficulty: question.difficulty,
      notes: "Skipped LLM evaluation because text-only solver should not judge existing image/SVG content.",
    },
  };
}

function getPlaceholderOptions(question: QuestionRow): QuestionOption[] {
  if (question.questionType !== "multiple_choice") {
    return [];
  }

  return question.options.filter((option) => {
    const label = String.fromCharCode(64 + option.displayOrder);
    const normalized = normalizeAnswerText(repairScrapedMojibake(option.optionText)).toLowerCase();
    return normalized === `option ${label.toLowerCase()}` || normalized === `choice ${label.toLowerCase()}`;
  });
}

function hasPlaceholderOptions(question: QuestionRow): boolean {
  return getPlaceholderOptions(question).length > 0;
}

function buildFastPlaceholderOptionOutcome(question: QuestionRow, assetAnalysis: QuestionAssetAnalysis): EvaluationOutcome {
  const placeholders = getPlaceholderOptions(question);

  return {
    question,
    assetAnalysis,
    solverResults: [],
    fastPath: "defective_placeholder_options",
    evaluator: {
      questionId: question.id,
      status: "defective",
      confidence: 1,
      defectiveReasons: [
        `Answer choices contain placeholder text instead of usable content: ${placeholders
          .map((option) => `${option.optionCode}=${JSON.stringify(option.optionText)}`)
          .join(", ")}.`,
      ],
      needsVisualReview: false,
      needsMathReview: false,
      difficulty: question.difficulty,
      notes: "Skipped LLM evaluation because deterministic answer-choice gate found placeholder option text.",
    },
  };
}

function buildKnownIssueOutcome(question: QuestionRow, assetAnalysis: QuestionAssetAnalysis, issue: KnownIssue): EvaluationOutcome {
  if (issue.type === "defective") {
    return {
      question,
      assetAnalysis,
      solverResults: [],
      fastPath: "known_issue",
      evaluator: {
        questionId: question.id,
        status: "defective",
        confidence: 1,
        defectiveReasons: [`Known issue: ${issue.reason}`],
        needsVisualReview: false,
        needsMathReview: false,
        difficulty: question.difficulty,
        notes: "Skipped LLM evaluation because this question is in the known-issues list.",
      },
    };
  }

  const option = resolveOption(question, issue.correctOptionCode);
  return {
    question,
    assetAnalysis,
    solverResults: [],
    fastPath: "known_issue",
    evaluator: {
      questionId: question.id,
      status: "valid",
      confidence: 1,
      defectiveReasons: [],
      verifiedAnswer: option
        ? {
            type: "multiple_choice",
            optionCode: option.optionCode,
            optionText: option.optionText,
          }
        : {
            type: "multiple_choice",
            optionCode: issue.correctOptionCode,
          },
      needsVisualReview: false,
      needsMathReview: false,
      difficulty: question.difficulty,
      notes: `Known answer-key correction: ${issue.reason}`,
    },
  };
}

function enforceSafetyStatus(evaluator: EvaluatorResult, assetAnalysis: QuestionAssetAnalysis): EvaluatorResult {
  const trueDefectiveVisual = assetAnalysis.visualState === "missing_visual" || assetAnalysis.visualState === "bad_extra";
  if (assetAnalysis.mathWarnings.length > 0 && !(evaluator.status === "defective" && trueDefectiveVisual)) {
    return {
      ...evaluator,
      status: "needs_math_review",
      needsMathReview: true,
      defectiveReasons: [
        ...evaluator.defectiveReasons,
        evaluator.status === "defective"
          ? "Downgraded from defective because UI/KaTeX math warnings require review, not replacement."
          : "UI/KaTeX math warnings require review before automated evaluation.",
      ],
    };
  }

  if (
    (assetAnalysis.visualState === "svg_visual" || assetAnalysis.visualState === "image_visual")
    && (evaluator.status === "defective" || evaluator.needsVisualReview)
  ) {
    return {
      ...evaluator,
      status: "needs_visual_review",
      needsVisualReview: true,
      defectiveReasons: [
        ...evaluator.defectiveReasons,
        "Downgraded from defective because a visual asset exists.",
      ],
    };
  }

  if (assetAnalysis.visualState === "missing_visual" || assetAnalysis.visualState === "bad_extra") {
    return evaluator;
  }

  if (evaluator.needsMathReview) {
    return { ...evaluator, status: "needs_math_review" };
  }

  if (evaluator.needsVisualReview) {
    return { ...evaluator, status: "needs_visual_review" };
  }

  return evaluator;
}

async function evaluateQuestionBatchWithSplit(
  questions: QuestionRow[],
  allowReplacement: boolean,
  splitDepth = 0,
  solverCache: SolverResultCache = new Map(),
): Promise<EvaluationOutcome[]> {
  const partition = questions.map((question) => ({
    question,
    assetAnalysis: analyzeQuestionAssets(question),
  }));
  const knownIssueOutcomes = partition
    .filter(({ question }) => knownIssuesById.has(question.id))
    .map(({ question, assetAnalysis }) => buildKnownIssueOutcome(question, assetAnalysis, knownIssuesById.get(question.id) as KnownIssue));
  const placeholderOutcomes = partition
    .filter(({ question, assetAnalysis }) =>
      !knownIssuesById.has(question.id) &&
      hasPlaceholderOptions(question) &&
      !isFastDefectiveVisualState(assetAnalysis.visualState) &&
      !isExistingVisualReviewState(assetAnalysis.visualState),
    )
    .map(({ question, assetAnalysis }) => buildFastPlaceholderOptionOutcome(question, assetAnalysis));
  const fastOutcomes = partition
    .filter(({ question, assetAnalysis }) =>
      !knownIssuesById.has(question.id) &&
      (isFastDefectiveVisualState(assetAnalysis.visualState) || isExistingVisualReviewState(assetAnalysis.visualState)),
    )
    .map(({ question, assetAnalysis }) => buildFastVisualOutcome(question, assetAnalysis));
  const llmQuestions = partition
    .filter(({ question, assetAnalysis }) =>
      !knownIssuesById.has(question.id) &&
      !hasPlaceholderOptions(question) &&
      !isFastDefectiveVisualState(assetAnalysis.visualState) &&
      !isExistingVisualReviewState(assetAnalysis.visualState),
    )
    .map(({ question }) => question);

  if (knownIssueOutcomes.length > 0 || fastOutcomes.length > 0 || placeholderOutcomes.length > 0) {
    const deterministicOutcomes = [...knownIssueOutcomes, ...fastOutcomes, ...placeholderOutcomes];
    await logger.write("batch-results.jsonl", {
      batchIds: deterministicOutcomes.map((outcome) => outcome.question.id),
      fastPath: true,
      statuses: deterministicOutcomes.map((outcome) => ({
        id: outcome.question.id,
        status: outcome.evaluator.status,
        fastPath: outcome.fastPath,
        visualState: outcome.assetAnalysis.visualState,
      })),
    });
  }

  if (llmQuestions.length !== questions.length) {
    const llmOutcomes = llmQuestions.length > 0
      ? await evaluateQuestionBatchWithSplit(llmQuestions, allowReplacement, splitDepth, solverCache)
      : [];
    const outcomesById = new Map([...knownIssueOutcomes, ...fastOutcomes, ...placeholderOutcomes, ...llmOutcomes].map((outcome) => [outcome.question.id, outcome]));
    return questions.map((question) => outcomesById.get(question.id)).filter((outcome): outcome is EvaluationOutcome => Boolean(outcome));
  }

  try {
    return await evaluateQuestionBatch(questions, allowReplacement, splitDepth, solverCache);
  } catch (error) {
    if (!args.splitOnTimeout || questions.length <= 1) {
      throw error;
    }

    const midpoint = Math.ceil(questions.length / 2);
    const left = questions.slice(0, midpoint);
    const right = questions.slice(midpoint);
    await logger.write("batch-splits.jsonl", {
      splitDepth,
      size: questions.length,
      left: left.map((question) => question.id),
      right: right.map((question) => question.id),
      error: error instanceof Error ? error.message : String(error),
    });

    const leftResults = await evaluateQuestionBatchWithSplit(left, allowReplacement, splitDepth + 1, solverCache);
    const rightResults = await evaluateQuestionBatchWithSplit(right, allowReplacement, splitDepth + 1, solverCache);
    return [...leftResults, ...rightResults];
  }
}

async function evaluateQuestion(question: QuestionRow, allowReplacement: boolean) {
  const [outcome] = await evaluateQuestionBatchWithSplit([question], allowReplacement);
  return { solverResults: outcome.solverResults, evaluator: outcome.evaluator };
}

async function retry<T>(task: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (error instanceof NoContentModelOutputError) {
        throw error;
      }
      lastError = error;
      if (attempt < args.maxAttempts) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildValidQuestionPlan(question: QuestionRow, evaluator: EvaluatorResult): MutationPlan {
  const formatted = formatQuestionFields(question);
  const questionUpdate: Record<string, unknown> = { ...formatted.questionUpdate };
  const optionUpdates = [...formatted.optionUpdates];
  const reasons = [...formatted.textPatches.map((patch) => `Formatted ${patch.path} text for PDF/UI rendering.`)];

  const desiredDifficulty = evaluator.difficulty ?? question.difficulty;
  if (desiredDifficulty !== question.difficulty) {
    questionUpdate.difficulty = desiredDifficulty;
    reasons.push(`Difficulty updated from ${question.difficulty} to ${desiredDifficulty}.`);
  }

  const desiredPoints = expectedPoints(desiredDifficulty);
  if (question.points !== desiredPoints) {
    questionUpdate.points = desiredPoints;
    reasons.push(`Points updated from ${question.points} to ${desiredPoints}.`);
  }

  if (evaluator.taxonomy && isValidTaxonomy(evaluator.taxonomy.section, evaluator.taxonomy.domain, evaluator.taxonomy.skill)) {
    if (evaluator.taxonomy.domain !== question.domain) {
      questionUpdate.domain = evaluator.taxonomy.domain;
      reasons.push(`Domain updated to ${evaluator.taxonomy.domain}.`);
    }
    if (evaluator.taxonomy.skill !== question.skill) {
      questionUpdate.skill = evaluator.taxonomy.skill;
      reasons.push(`Skill updated to ${evaluator.taxonomy.skill}.`);
    }
  }

  const answerPatch = buildAnswerPatch(question, evaluator);
  return {
    questionId: question.id,
    questionUpdate,
    optionUpdates,
    correctOptionId: answerPatch.correctOptionId,
    sprAnswers: answerPatch.sprAnswers ?? formatted.sprAnswers,
    textPatches: formatted.textPatches,
    reasons: [...reasons, ...answerPatch.reasons],
  };
}

function buildAnswerPatch(question: QuestionRow, evaluator: EvaluatorResult) {
  const reasons: string[] = [];
  if (evaluator.confidence < args.minEvaluatorConfidence || !evaluator.verifiedAnswer) {
    return { reasons };
  }

  if (question.questionType === "multiple_choice") {
    const option = resolveOption(question, evaluator.verifiedAnswer.optionCode, evaluator.verifiedAnswer.optionText);
    if (!option || question.correctOption?.optionId === option.id) {
      return { reasons };
    }

    reasons.push(`Correct option updated to display order ${option.displayOrder}.`);
    return { correctOptionId: option.id, reasons };
  }

  const acceptedAnswers = [
    ...(evaluator.verifiedAnswer.acceptedAnswers ?? []),
    ...(evaluator.verifiedAnswer.acceptedAnswer ? [evaluator.verifiedAnswer.acceptedAnswer] : []),
  ]
    .map((answer) => answer.trim())
    .filter((answer, index, all) => answer && all.indexOf(answer) === index);

  if (acceptedAnswers.length === 0 || arraysEqual(acceptedAnswers, question.sprAnswers.map((answer) => answer.acceptedAnswer))) {
    return { reasons };
  }

  reasons.push("SPR accepted answers updated from evaluator verification.");
  return { sprAnswers: acceptedAnswers, reasons };
}

function resolveOption(question: QuestionRow, optionCode?: string, optionText?: string) {
  if (optionCode) {
    const normalized = optionCode.trim().toUpperCase();
    const letterIndex = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(normalized);
    if (letterIndex >= 0) {
      const byDisplayOrder = question.options.find((option) => option.displayOrder === letterIndex + 1);
      if (byDisplayOrder) return byDisplayOrder;
    }

    const byCode = question.options.find((option) => option.optionCode.toUpperCase() === normalized || option.optionCode.toUpperCase() === optionCode.toUpperCase());
    if (byCode) return byCode;
  }

  if (optionText) {
    const normalizedText = normalizeAnswerText(optionText);
    return question.options.find((option) => normalizeAnswerText(option.optionText) === normalizedText) ?? null;
  }

  return null;
}

function normalizeAnswerText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function answerLabel(answer: SolverResult["answer"] | ReturnType<typeof buildOfficialAnswer> | null | undefined) {
  if (!answer) return null;
  if (answer.type === "spr") {
    const answers = "acceptedAnswers" in answer && Array.isArray(answer.acceptedAnswers)
      ? answer.acceptedAnswers
      : "acceptedAnswer" in answer && answer.acceptedAnswer
        ? [answer.acceptedAnswer]
        : [];
    return answers.length > 0 ? answers.join(" / ") : null;
  }

  return answer.optionCode ?? answer.optionText ?? null;
}

function pushEvaluatorAnswerRecord(outcome: EvaluationOutcome) {
  const { question, evaluator, solverResults } = outcome;
  const dbAnswer = buildOfficialAnswer(question);
  const evaluatorAnswer = evaluator.verifiedAnswer ?? null;
  evaluatorAnswerRecords.push({
    runOrder: ++evaluatorAnswerRunOrder,
    id: question.id,
    testTitle: question.testTitle,
    sectionName: question.sectionName,
    moduleNumber: question.moduleNumber,
    position: question.position,
    questionType: question.questionType,
    questionText: question.questionText,
    passage: question.passage,
    choices: question.options,
    dbAnswer,
    dbAnswerLabel: answerLabel(dbAnswer),
    evaluatorStatus: evaluator.status,
    evaluatorConfidence: evaluator.confidence,
    evaluatorVerifiedAnswer: evaluatorAnswer,
    evaluatorAnswerLabel: answerLabel(evaluatorAnswer),
    evaluatorDefectiveReasons: evaluator.defectiveReasons,
    evaluatorNeedsVisualReview: Boolean(evaluator.needsVisualReview),
    evaluatorNeedsMathReview: Boolean(evaluator.needsMathReview),
    evaluatorTaxonomy: evaluator.taxonomy ?? null,
    evaluatorDifficulty: evaluator.difficulty ?? null,
    evaluatorNotes: evaluator.notes ?? null,
    solverAnswers: solverResults.map((solver) => ({
      solver: solver.solver,
      answer: solver.answer,
      answerLabel: answerLabel(solver.answer),
      confidence: solver.confidence,
      needsVisualReview: Boolean(solver.needsVisualReview),
      needsMathReview: Boolean(solver.needsMathReview),
      defectiveSignals: solver.defectiveSignals,
      reasoning: solver.reasoning || null,
    })),
    answerChangedByEvaluator: Boolean(evaluatorAnswer && answerLabel(evaluatorAnswer) !== answerLabel(dbAnswer)),
    fastPath: outcome.fastPath ?? null,
  });
}

function findDuplicateOptionTextGroups(question: QuestionRow) {
  const groups: Array<{ optionText: string; options: QuestionOption[] }> = [];
  const optionTextMap = new Map<string, QuestionOption[]>();
  for (const option of question.options) {
    const normalizedText = normalizeAnswerText(repairScrapedMojibake(option.optionText));
    if (!normalizedText) continue;
    optionTextMap.set(normalizedText, [...(optionTextMap.get(normalizedText) ?? []), option]);
  }

  for (const [optionText, options] of optionTextMap.entries()) {
    if (options.length > 1) {
      groups.push({ optionText, options });
    }
  }

  return groups;
}

function collectQuestionQualityIssues(outcome: EvaluationOutcome): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { question, solverResults, evaluator } = outcome;

  if (question.questionType === "multiple_choice") {
    const placeholderOptions = getPlaceholderOptions(question);
    if (placeholderOptions.length > 0) {
      issues.push({
        type: "placeholder_option_text",
        severity: "error",
        details: {
          optionIds: placeholderOptions.map((option) => option.id),
          optionCodes: placeholderOptions.map((option) => option.optionCode),
          optionTexts: placeholderOptions.map((option) => option.optionText),
          correctOptionId: question.correctOption?.optionId ?? null,
        },
      });
    }

    for (const { optionText, options } of findDuplicateOptionTextGroups(question)) {
      issues.push({
        type: "duplicate_option_text",
        severity: "warning",
        details: {
          optionText,
          optionIds: options.map((option) => option.id),
          optionCodes: options.map((option) => option.optionCode),
          displayOrders: options.map((option) => option.displayOrder),
          correctOptionId: question.correctOption?.optionId ?? null,
        },
      });
    }
  }

  const solverAnswers = solverResults
    .map((result) => result.answer.optionCode ?? result.answer.optionText ?? result.answer.acceptedAnswer ?? "")
    .map((answer) => normalizeAnswerText(answer))
    .filter(Boolean);
  const uniqueSolverAnswers = [...new Set(solverAnswers.map((answer) => answer.toLowerCase()))];
  if (uniqueSolverAnswers.length > 1) {
    issues.push({
      type: "solver_answer_disagreement",
      severity: "info",
      details: {
        solverAnswers: solverResults.map((result) => ({
          solver: result.solver,
          answer: result.answer.optionCode ?? result.answer.optionText ?? result.answer.acceptedAnswer ?? null,
          confidence: result.confidence,
        })),
        evaluatorStatus: evaluator.status,
        evaluatorConfidence: evaluator.confidence,
      },
    });
  }

  if (evaluator.confidence > 0 && evaluator.confidence < args.minEvaluatorConfidence) {
    issues.push({
      type: "low_evaluator_confidence",
      severity: "warning",
      details: {
        evaluatorConfidence: evaluator.confidence,
        minEvaluatorConfidence: args.minEvaluatorConfidence,
        notes: evaluator.notes ?? null,
      },
    });
  }

  return issues;
}

function validateFastReplacementCandidate(target: QuestionRow, source: QuestionRow) {
  const gates: Record<string, boolean> = {
    shapeCompatible: isReplacementShapeCompatible(target, source),
    answerKeyExists: source.questionType === "multiple_choice" ? Boolean(source.correctOption) : source.sprAnswers.length > 0,
    visualSafe: false,
    mathSafe: false,
    noDuplicateOptionText: source.questionType !== "multiple_choice" || findDuplicateOptionTextGroups(source).length === 0,
    noPlaceholderOptionText: source.questionType !== "multiple_choice" || !hasPlaceholderOptions(source),
  };
  const assetAnalysis = analyzeQuestionAssets(source);
  gates.visualSafe = assetAnalysis.visualState === "none" || assetAnalysis.visualState === "text_table";
  gates.mathSafe = assetAnalysis.mathWarnings.length === 0;

  const failedGate = Object.entries(gates).find(([, passed]) => !passed)?.[0];
  return {
    ok: !failedGate,
    gates,
    rejectReason: failedGate ?? null,
    assetAnalysis,
  };
}

async function logReplacementRejected(params: {
  defectiveId: string;
  candidateId: string;
  reason: string;
  details?: Record<string, unknown>;
}) {
  await logger.write("replacement-rejected.jsonl", params);
  await logger.write("quality-issues.jsonl", {
    questionId: params.candidateId,
    issueType: "replacement_candidate_rejected",
    severity: "info",
    defectiveId: params.defectiveId,
    reason: params.reason,
    ...(params.details ?? {}),
  });
}

async function buildReplacementPlan(
  pool: Pool,
  defective: QuestionRow,
  evaluator: EvaluatorResult,
  options: { deterministicOnly?: boolean } = {},
): Promise<MutationPlan | null> {
  const candidates = await fetchReplacementCandidates(pool, defective);
  await logger.write("defective.jsonl", {
    id: defective.id,
    testTitle: defective.testTitle,
    reasons: evaluator.defectiveReasons,
    candidateIds: candidates,
  });

  for (const candidateId of candidates) {
    const candidate = await fetchQuestion(pool, candidateId);
    if (!candidate || !isReplacementShapeCompatible(defective, candidate)) {
      await logReplacementRejected({
        defectiveId: defective.id,
        candidateId,
        reason: candidate ? "shape_incompatible" : "candidate_not_found",
      });
      continue;
    }

    if (options.deterministicOnly) {
      const validation = validateFastReplacementCandidate(defective, candidate);
      if (!validation.ok) {
        await logReplacementRejected({
          defectiveId: defective.id,
          candidateId,
          reason: validation.rejectReason ?? "deterministic_gate_failed",
          details: {
            gates: validation.gates,
            visualState: validation.assetAnalysis.visualState,
            mathWarningCount: validation.assetAnalysis.mathWarnings.length,
          },
        });
        continue;
      }

      await logger.write("fast-replacements.jsonl", {
        targetId: defective.id,
        visualState: analyzeQuestionAssets(defective).visualState,
        selectedCandidateId: candidate.id,
        gates: validation.gates,
      });
      return buildReplacementMutation(defective, candidate);
    }

    const candidateEval = await evaluateQuestion(candidate, false);
    if (candidateEval.evaluator.status !== "valid") {
      await logReplacementRejected({
        defectiveId: defective.id,
        candidateId,
        reason: "candidate_defective",
        details: { evaluator: candidateEval.evaluator },
      });
      continue;
    }

    return buildReplacementMutation(defective, candidate);
  }

  await logger.write("replacement-unresolved.jsonl", {
    id: defective.id,
    testTitle: defective.testTitle,
    reasons: evaluator.defectiveReasons,
  });
  return null;
}

function isReplacementShapeCompatible(target: QuestionRow, source: QuestionRow) {
  if (target.questionType !== source.questionType) return false;
  if (target.questionType === "multiple_choice" && target.options.length !== source.options.length) return false;
  return target.sectionName === source.sectionName
    && target.difficulty === source.difficulty
    && (target.domain ?? "") === (source.domain ?? "")
    && (target.skill ?? "") === (source.skill ?? "")
    && extractTestPeriod(target.testTitle) !== extractTestPeriod(source.testTitle);
}

function buildReplacementMutation(target: QuestionRow, source: QuestionRow): MutationPlan {
  const formatted = formatQuestionFields(source);
  const questionUpdate: Record<string, unknown> = {
    question_type: source.questionType,
    question_text: formatted.questionUpdate.question_text ?? source.questionText,
    passage: Object.prototype.hasOwnProperty.call(formatted.questionUpdate, "passage") ? formatted.questionUpdate.passage : source.passage,
    explanation: formatted.questionUpdate.explanation ?? source.explanation,
    difficulty: source.difficulty,
    points: expectedPoints(source.difficulty),
    domain: source.domain,
    skill: source.skill,
    image_url: source.imageUrl,
    extra: Object.prototype.hasOwnProperty.call(formatted.questionUpdate, "extra") ? formatted.questionUpdate.extra : source.extra,
  };

  const optionUpdates = target.options.map((targetOption, index) => {
    const sourceOption = source.options[index];
    return {
      id: targetOption.id,
      option_code: sourceOption.optionCode,
      option_text: sourceOption.optionText,
      display_order: sourceOption.displayOrder,
    };
  });

  let correctOptionId: string | null | undefined;
  let sprAnswers: string[] | undefined;
  if (source.questionType === "multiple_choice" && source.correctOption) {
    const targetCorrectByOrder = target.options.find((option) => option.displayOrder === source.correctOption?.displayOrder);
    correctOptionId = targetCorrectByOrder?.id ?? null;
  } else if (source.questionType === "spr") {
    sprAnswers = source.sprAnswers.map((answer) => answer.acceptedAnswer);
  }

  return {
    questionId: target.id,
    replacementSourceId: source.id,
    questionUpdate,
    optionUpdates,
    correctOptionId,
    sprAnswers,
    textPatches: formatted.textPatches,
    reasons: [
      `Defective question replaced with ${source.id} from ${source.testTitle}.`,
      ...formatted.textPatches.map((patch) => `Formatted replacement ${patch.path} text for PDF/UI rendering.`),
    ],
  };
}

function hasMutation(plan: MutationPlan | null) {
  return Boolean(
    plan
      && (
        Object.keys(plan.questionUpdate).length > 0
        || plan.optionUpdates.length > 0
        || plan.correctOptionId !== undefined
        || plan.sprAnswers !== undefined
      ),
  );
}

async function applyMutation(pool: Pool, plan: MutationPlan, backup: QuestionRow) {
  await logger.write("backup.jsonl", { id: backup.id, backup });
  await logger.write("patches.jsonl", {
    questionId: plan.questionId,
    replacementSourceId: plan.replacementSourceId,
    questionUpdateFields: Object.keys(plan.questionUpdate),
    optionUpdateCount: plan.optionUpdates.length,
    correctOptionId: plan.correctOptionId,
    sprAnswerCount: plan.sprAnswers?.length,
    textPatches: plan.textPatches,
    reasons: plan.reasons,
  });

  await logger.write("replacement-updates.sql.jsonl", {
    questionId: plan.questionId,
    replacementSourceId: plan.replacementSourceId,
    execute: args.execute,
    statements: buildSqlLog(plan),
  });

  if (!args.execute) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    if (Object.keys(plan.questionUpdate).length > 0) {
      const fields = Object.keys(plan.questionUpdate);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ");
      await client.query(`update public.questions set ${setClause} where id = $1`, [
        plan.questionId,
        ...fields.map((field) => plan.questionUpdate[field]),
      ]);
    }

    for (const option of plan.optionUpdates) {
      const fields = Object.keys(option).filter((field) => field !== "id");
      if (fields.length === 0) continue;
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ");
      await client.query(`update public.question_options set ${setClause} where id = $1`, [
        option.id,
        ...fields.map((field) => option[field as keyof typeof option]),
      ]);
    }

    if (plan.correctOptionId !== undefined) {
      if (plan.correctOptionId === null) {
        await client.query("delete from public.question_correct_options where question_id = $1", [plan.questionId]);
      } else {
        await client.query(
          `
            insert into public.question_correct_options (question_id, option_id)
            values ($1, $2)
            on conflict (question_id) do update set option_id = excluded.option_id
          `,
          [plan.questionId, plan.correctOptionId],
        );
      }
    }

    if (plan.sprAnswers !== undefined) {
      await client.query("delete from public.question_spr_accepted_answers where question_id = $1", [plan.questionId]);
      for (const [index, answer] of plan.sprAnswers.entries()) {
        await client.query(
          `
            insert into public.question_spr_accepted_answers (question_id, accepted_answer, display_order)
            values ($1, $2, $3)
          `,
          [plan.questionId, answer, index + 1],
        );
      }
    }

    await client.query("commit");
    await logger.write("commits.jsonl", {
      questionId: plan.questionId,
      replacementSourceId: plan.replacementSourceId,
      committed: true,
    });
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function buildSqlLog(plan: MutationPlan) {
  const statements: Array<Record<string, unknown>> = [];
  if (Object.keys(plan.questionUpdate).length > 0) {
    statements.push({
      table: "public.questions",
      sql: "update public.questions set <fields> where id = $1",
      id: plan.questionId,
      fields: Object.keys(plan.questionUpdate),
    });
  }
  for (const option of plan.optionUpdates) {
    statements.push({
      table: "public.question_options",
      sql: "update public.question_options set <fields> where id = $1",
      id: option.id,
      fields: Object.keys(option).filter((field) => field !== "id"),
    });
  }
  if (plan.correctOptionId !== undefined) {
    statements.push({
      table: "public.question_correct_options",
      sql: plan.correctOptionId === null
        ? "delete from public.question_correct_options where question_id = $1"
        : "insert into public.question_correct_options (...) values (...) on conflict (question_id) do update ...",
      questionId: plan.questionId,
      optionId: plan.correctOptionId,
    });
  }
  if (plan.sprAnswers !== undefined) {
    statements.push({
      table: "public.question_spr_accepted_answers",
      sql: "delete existing answers then insert accepted answers for question_id = $1",
      questionId: plan.questionId,
      count: plan.sprAnswers.length,
    });
  }
  return statements;
}

async function processOutcome(pool: Pool, outcome: EvaluationOutcome): Promise<ProcessResult> {
  const { question, evaluator, assetAnalysis } = outcome;
  let plan: MutationPlan | null = null;
  const qualityIssues = collectQuestionQualityIssues(outcome);
  pushEvaluatorAnswerRecord(outcome);

  if (evaluator.status === "defective") {
    if (assetAnalysis.visualState === "missing_visual" || assetAnalysis.visualState === "bad_extra") {
      await logger.write("visual-required-issues.jsonl", {
        id: question.id,
        testTitle: question.testTitle,
        sectionName: question.sectionName,
        moduleNumber: question.moduleNumber,
        position: question.position,
        visualState: assetAnalysis.visualState,
        imagePresent: assetAnalysis.imagePresent,
        svgPresent: assetAnalysis.svgPresent,
        hasTableMarkdown: Boolean(assetAnalysis.tableMarkdown),
        badExtraReason: assetAnalysis.badExtraReason,
        visualWarnings: assetAnalysis.visualWarnings,
        reasons: evaluator.defectiveReasons,
      });
    }
    plan = await buildReplacementPlan(pool, question, evaluator, {
      deterministicOnly: outcome.fastPath === "defective_visual" || outcome.fastPath === "known_issue",
    });
  } else if (evaluator.status === "valid") {
    plan = buildValidQuestionPlan(question, evaluator);
  } else if (evaluator.status === "needs_visual_review") {
    await logger.write("needs-visual-review.jsonl", {
      id: question.id,
      testTitle: question.testTitle,
      visualState: assetAnalysis.visualState,
      reasons: evaluator.defectiveReasons,
      notes: evaluator.notes,
    });
  } else if (evaluator.status === "needs_math_review") {
    await logger.write("needs-math-review.jsonl", {
      id: question.id,
      testTitle: question.testTitle,
      warnings: assetAnalysis.mathWarnings,
      reasons: evaluator.defectiveReasons,
      notes: evaluator.notes,
    });
  }

  for (const issue of qualityIssues) {
    await logger.write("quality-issues.jsonl", {
      questionId: question.id,
      testTitle: question.testTitle,
      sectionName: question.sectionName,
      moduleNumber: question.moduleNumber,
      position: question.position,
      status: evaluator.status,
      issueType: issue.type,
      severity: issue.severity,
      ...issue.details,
    });
  }

  if (evaluator.verifiedAnswer && answerLabel(evaluator.verifiedAnswer) !== answerLabel(buildOfficialAnswer(question))) {
    await logger.write("answer-key-issues.jsonl", {
      id: question.id,
      testTitle: question.testTitle,
      sectionName: question.sectionName,
      moduleNumber: question.moduleNumber,
      position: question.position,
      dbAnswer: buildOfficialAnswer(question),
      evaluatorVerifiedAnswer: evaluator.verifiedAnswer,
      confidence: evaluator.confidence,
      notes: evaluator.notes,
      fastPath: outcome.fastPath ?? null,
    });
  }

  if (hasMutation(plan)) {
    await applyMutation(pool, plan as MutationPlan, question);
  }

  const result: ProcessResult = {
    id: question.id,
    success: true,
    status: evaluator.status,
    patchApplied: hasMutation(plan),
    replacementSourceId: plan?.replacementSourceId,
  };
  await logger.write("evaluated.jsonl", result);
  return result;
}

async function processQuestionBatch(pool: Pool, ids: string[]): Promise<ProcessResult[]> {
  const questions: QuestionRow[] = [];
  for (const id of ids) {
    const question = await fetchQuestion(pool, id);
    if (!question) {
      throw new Error(`Question not found: ${id}`);
    }
    questions.push(question);
  }

  for (const question of questions) {
    const assetAnalysis = analyzeQuestionAssets(question);
    await logger.write("asset-classification.jsonl", {
      id: question.id,
      visualState: assetAnalysis.visualState,
      mentionsVisual: assetAnalysis.mentionsVisual,
      imagePresent: assetAnalysis.imagePresent,
      svgPresent: assetAnalysis.svgPresent,
      hasTableMarkdown: Boolean(assetAnalysis.tableMarkdown),
      badExtraReason: assetAnalysis.badExtraReason,
      mathWarningCount: assetAnalysis.mathWarnings.length,
      visualWarnings: assetAnalysis.visualWarnings,
    });
    if (assetAnalysis.visualWarnings.length > 0) {
      await logger.write("visual-asset-suspect.jsonl", {
        id: question.id,
        testTitle: question.testTitle,
        sectionName: question.sectionName,
        moduleNumber: question.moduleNumber,
        position: question.position,
        visualState: assetAnalysis.visualState,
        warnings: assetAnalysis.visualWarnings,
      });
    }
  }

  const outcomes = await evaluateQuestionBatchWithSplit(questions, true);
  const results: ProcessResult[] = [];
  for (const outcome of outcomes) {
    results.push(await processOutcome(pool, outcome));
  }
  return results;
}

function chunkIds(ids: string[], batchSize: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }
  return chunks;
}

async function worker(pool: Pool, workerId: number, batches: string[][], state: { cursor: number; completed: number; failed: number }) {
  for (;;) {
    const index = state.cursor;
    state.cursor += 1;
    const batch = batches[index];
    if (!batch) return;

    await logger.write("batches.jsonl", {
      workerId,
      batchIndex: index,
      size: batch.length,
      ids: batch,
    });

    try {
      const results = await processQuestionBatch(pool, batch);
      for (const result of results) {
        state.completed += 1;
        console.log(JSON.stringify({
          workerId,
          batchIndex: index,
          id: result.id,
          status: result.status,
          patchApplied: result.patchApplied,
          completed: state.completed,
          failed: state.failed,
        }));
      }
    } catch (error) {
      state.failed += batch.length;
      for (const id of batch) {
        await logger.write("failed.jsonl", {
          id,
          workerId,
          batchIndex: index,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      console.error(JSON.stringify({
        workerId,
        batchIndex: index,
        ids: batch,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
}

async function main() {
  if (args.selfTest) {
    runSelfTests();
    return;
  }

  await loadKnownIssues();
  await logger.init();
  await logger.write("run.jsonl", {
    mode: args.execute ? "execute" : "dry-run",
    solverModel: args.solverModel,
    evaluatorModel: args.evaluatorModel,
    evaluatorFallbackModel: args.evaluatorFallbackModel,
    evaluatorMaxAttempts: args.evaluatorMaxAttempts,
    opencodeAgent: args.opencodeAgent,
    workers: args.workers,
    llmConcurrency: args.llmConcurrency,
    solverConcurrency: args.solverConcurrency,
    batchSize: args.batchSize,
    llmBatchSize: args.llmBatchSize,
    sample: args.sample,
    limit: args.limit,
    maxNew: args.maxNew,
    skipCompletedFrom: args.skipCompletedFrom,
    knownIssueCount: knownIssuesById.size,
    publicOnly: args.publicOnly,
    useSupabasePooler: args.useSupabasePooler,
    supabasePoolerHost: args.useSupabasePooler ? args.supabasePoolerHost : undefined,
  });

  const pool = new Pool({
    ...buildPgConfig(),
    max: args.workers,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  try {
    let ids = await fetchTargetIds(pool);
    if (args.resume) {
      const completed = await readCompletedIds(args.outputDir);
      ids = ids.filter((id) => !completed.has(id));
    }
    if (args.skipCompletedFrom.length > 0) {
      const completed = await readCompletedIdsFrom(args.skipCompletedFrom);
      ids = ids.filter((id) => !completed.has(id));
    }
    if (args.maxNew) {
      ids = ids.slice(0, args.maxNew);
    }

    const batches = chunkIds(ids, args.llmBatchSize);
    console.log(JSON.stringify({
      mode: args.execute ? "execute" : "dry-run",
      outputDir: args.outputDir,
      totalIds: ids.length,
      totalBatches: batches.length,
      batchSize: args.batchSize,
      llmBatchSize: args.llmBatchSize,
      maxNew: args.maxNew,
      workers: args.workers,
      llmConcurrency: args.llmConcurrency,
      solverConcurrency: args.solverConcurrency,
      useSupabasePooler: args.useSupabasePooler,
      supabasePoolerHost: args.useSupabasePooler ? args.supabasePoolerHost : undefined,
    }, null, 2));

    const state = { cursor: 0, completed: 0, failed: 0 };
    await Promise.all(Array.from({ length: args.workers }, (_value, index) => worker(pool, index + 1, batches, state)));
    await logger.write("summary.jsonl", {
      totalIds: ids.length,
      completed: state.completed,
      failed: state.failed,
      mode: args.execute ? "execute" : "dry-run",
    });
    await writeEvaluatorAnswersJson(args.outputDir);
  } finally {
    await pool.end();
    await logger.flush();
  }

  if (args.shutdownOnComplete) {
    scheduleWindowsShutdown();
  }
}

async function writeEvaluatorAnswersJson(outputDir: string) {
  const byStatus = evaluatorAnswerRecords.reduce<Record<string, number>>((acc, record) => {
    acc[record.evaluatorStatus] = (acc[record.evaluatorStatus] ?? 0) + 1;
    return acc;
  }, {});
  const output = {
    generatedAt: new Date().toISOString(),
    description: "Evaluator/model answers for this dry-run. dbAnswer is current database answer; evaluatorVerifiedAnswer is proposed answer. No database writes occur unless --execute is used.",
    summary: {
      total: evaluatorAnswerRecords.length,
      byStatus,
      answerChangedByEvaluator: evaluatorAnswerRecords.filter((record) => record.answerChangedByEvaluator).length,
    },
    questions: evaluatorAnswerRecords,
  };
  await writeFile(path.join(outputDir, `evaluator-answers-${evaluatorAnswerRecords.length}.json`), JSON.stringify(output, null, 2), "utf8");
  await writeFile(path.join(outputDir, "evaluator-answers.json"), JSON.stringify(output, null, 2), "utf8");
}

function scheduleWindowsShutdown() {
  if (process.platform !== "win32") {
    console.error("--shutdown-on-complete is only implemented for Windows shutdown.");
    return;
  }

  spawn("shutdown", [
    "/s",
    "/t",
    String(args.shutdownDelaySeconds),
    "/c",
    "Question corpus dry-run finished",
  ], {
    windowsHide: true,
    stdio: "ignore",
  }).unref();
}

function runSelfTests() {
  assert.equal(convertDoubleDollarMath("Solve $$x+1=2$$ now.").value, "Solve \\(x+1=2\\) now.");
  assert.equal(convertDoubleDollarMath("I have $5 and you have $7.").value, "I have $5 and you have $7.");
  assert.equal(convertDoubleDollarMath("Cost is $100.00 and math $$x^2$$.").value, "Cost is $100.00 and math \\(x^2\\).");
  assert.equal(convertDoubleDollarMath("Escaped \\$$x\\$$ stays.").value, "Escaped \\$$x\\$$ stays.");
  assert.equal(convertDoubleDollarMath("<p>$$x$$</p>").value, "<p>\\(x\\)</p>");
  assert.equal(repairScrapedMojibake("researchersâ€™ hypothesis and 30Â°"), "researchers\u2019 hypothesis and 30\u00b0");
  assert.equal(isValidTaxonomy("Math", "Algebra", "Linear equations in one variable"), true);
  assert.equal(isValidTaxonomy("Math", "Expression of Ideas", "Transitions"), false);
  assert.equal(expectedPoints("hard"), 10);
  assert.equal(expectedPoints("medium"), 20);
  assert.equal(expectedPoints("easy"), 30);
  assert.equal(
    tableToMarkdown({ title: "Scores", headers: ["Name", "Value"], rows: [["A", "1"], ["B", "2"]] }),
    "Table title: Scores\n| Name | Value |\n| --- | --- |\n| A | 1 |\n| B | 2 |",
  );
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "According to the graph, what is true?",
  }).visualState, "missing_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "For the linear function f, the graph of y=f(x) has a slope of 25 and passes through (0, 0). Which equation defines f?",
  }).visualState, "none");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "The function f is defined by f(x)=(x-2)(x-9)(x+4). The graph of y=h(x) is the result of translating y=f(x) up 7 units. What is the y-intercept?",
  }).visualState, "none");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "The histogram shows the distribution of 20 lengths, in feet, in a data set.",
  }).visualState, "missing_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "The graph models the relationship between distance and time.",
  }).visualState, "missing_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "Which expression represents the length of line segment AB?",
  }).visualState, "missing_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    passage: "Note: Figure not drawn to scale.",
    questionText: "In the right triangle shown, what is the value of cos A?",
  }).visualState, "missing_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "Which choice most effectively uses data from the table to complete the example?",
  }).visualState, "missing_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    imageUrl: "https://example.com/graph.png",
    questionText: "The graph models the relationship between distance and time.",
  }).visualState, "missing_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    imageUrl: "https://example.com/unused.png",
    questionText: "What is 1+1?",
  }).visualState, "image_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    questionText: "According to the graph, what is true?",
    extra: { type: "figure_chart", content: "<svg><text>Graph</text></svg>" },
  }).visualState, "svg_visual");
  assert.equal(analyzeQuestionAssets({
    ...buildSelfTestQuestion(),
    extra: { type: "table", content: "x,y\n1,2" },
  }).visualState, "text_table");
  const missingVisualQuestion = {
    ...buildSelfTestQuestion(),
    questionText: "According to the graph, what is true?",
  };
  assert.equal(
    buildFastVisualOutcome(missingVisualQuestion, analyzeQuestionAssets(missingVisualQuestion)).evaluator.status,
    "defective",
  );
  assert.equal(validateFastReplacementCandidate(buildSelfTestQuestion(), {
    ...buildSelfTestQuestion(),
    id: "duplicate-option-source",
    testTitle: "2026 June",
    options: [
      { id: "a", optionCode: "choice_0", optionText: "same", displayOrder: 1 },
      { id: "b", optionCode: "choice_1", optionText: "same", displayOrder: 2 },
    ],
    correctOption: { optionId: "a", optionCode: "choice_0", optionText: "same", displayOrder: 1 },
  }).ok, false);
  const placeholderOptionQuestion = {
    ...buildSelfTestQuestion(),
    id: "placeholder-option-source",
    options: [
      { id: "a", optionCode: "choice_0", optionText: "Full answer", displayOrder: 1 },
      { id: "b", optionCode: "choice_1", optionText: "Option B", displayOrder: 2 },
    ],
    correctOption: { optionId: "a", optionCode: "choice_0", optionText: "Full answer", displayOrder: 1 },
  };
  assert.equal(hasPlaceholderOptions(placeholderOptionQuestion), true);
  assert.equal(
    buildFastPlaceholderOptionOutcome(placeholderOptionQuestion, analyzeQuestionAssets(placeholderOptionQuestion)).evaluator.status,
    "defective",
  );
  assert.equal(validateFastReplacementCandidate(buildSelfTestQuestion(), placeholderOptionQuestion).ok, false);
  assert.equal(
    buildKnownIssueOutcome({
      ...buildSelfTestQuestion(),
      id: "3ee20bdd-f073-4183-835e-6f2364b46941",
      options: [
        { id: "a", optionCode: "choice_0", optionText: "A", displayOrder: 1 },
        { id: "b", optionCode: "choice_1", optionText: "B", displayOrder: 2 },
        { id: "c", optionCode: "choice_2", optionText: "thousands—that", displayOrder: 3 },
        { id: "d", optionCode: "choice_3", optionText: "thousands. That", displayOrder: 4 },
      ],
      correctOption: { optionId: "d", optionCode: "choice_3", optionText: "thousands. That", displayOrder: 4 },
    }, analyzeQuestionAssets(buildSelfTestQuestion()), BUILTIN_KNOWN_ISSUES[0]).evaluator.verifiedAnswer?.optionCode,
    "choice_2",
  );
  assert.equal(buildRendererTextPayload("question_text", "Use $x$ and $5.").rendererText, "Use \\(x\\) and \\$5.");
  console.log("evaluateQuestionCorpus self-test passed.");
}

function buildSelfTestQuestion(): QuestionRow {
  return {
    id: "self-test",
    legacyMongoId: null,
    sectionId: "section",
    sectionName: "Math",
    moduleNumber: 1,
    position: 1,
    questionType: "multiple_choice",
    questionText: "What is \\(x\\)?",
    passage: null,
    explanation: "Explanation",
    difficulty: "medium",
    points: 20,
    domain: "Algebra",
    skill: "Linear equations in one variable",
    imageUrl: null,
    extra: null,
    testId: "test",
    testTitle: "2026 May",
    testVisibility: "public",
    options: [
      { id: "a", optionCode: "choice_0", optionText: "1", displayOrder: 1 },
      { id: "b", optionCode: "choice_1", optionText: "2", displayOrder: 2 },
    ],
    correctOption: { optionId: "a", optionCode: "choice_0", optionText: "1", displayOrder: 1 },
    sprAnswers: [],
  };
}

main().catch(async (error) => {
  console.error(error);
  await logger.flush().catch(() => undefined);
  process.exit(1);
});
