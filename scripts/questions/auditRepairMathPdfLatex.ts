import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import katex from "katex";

import { normalizeQuestionExtra } from "@/lib/questionExtra";
import { MATH_SECTION } from "@/lib/sections";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMathDollarSuggestion } from "@/lib/testManagerReview";
import { tokenizeHtmlLatexContent } from "@/utils/latexTokenizer";
import { normalizeMathDelimiters } from "@/utils/mathContentNormalizer";

type QuestionRow = {
  id: string;
  question_text: string;
  passage: string | null;
  explanation: string;
  extra: unknown;
  question_options: Array<{
    id: string;
    option_text: string;
    display_order: number;
  }> | null;
  question_spr_accepted_answers: Array<{
    id: string;
    accepted_answer: string;
    display_order: number;
  }> | null;
  test_sections: {
    name: string;
    module_number: number | null;
    tests: {
      id: string;
      title: string;
      visibility: "public" | "private";
    } | null;
  } | null;
};

type PatchEntry = {
  table: "questions" | "question_options" | "question_spr_accepted_answers";
  id: string;
  field: string;
  originalValue: unknown;
  mutatedValue: unknown;
  questionId: string;
  testId?: string;
  testTitle?: string;
};

type ReviewEntry = {
  questionId: string;
  testId?: string;
  testTitle?: string;
  field: string;
  reason: string;
  value: string;
};

const KNOWN_SOURCE_FIXES: Record<string, Record<string, string>> = {
  "8440417f-9dc8-466f-8398-3934f278cacc": {
    question_text:
      "\\(\\text{Data set X}: 13, 15, 17, 20, 23, 24, 24, 25, 37\\)<br>\\(\\text{Data set Y}: 13, 15, 17, 20, 23, 24, 24, 25, 32\\)<br>Data set \\(Y\\) is created by replacing the number \\(37\\) in data set \\(X\\) with the number \\(32\\). Which of the following statements is true about the means and medians of data set \\(X\\) and data set \\(Y\\)?",
  },
  "efaf751e-1f15-4fff-8a47-115be4e2768b": {
    question_text:
      "\\(f(x)=1,500(0.5)^{14x}\\)<br>The function f models the intensity of a beam, f(x), in number of photons in the beam, x millimeters below the surface of a certain material. According to the model, what is the number of photons in the beam when it is at the surface of the material?",
  },
};

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const sampleLimit = Number.parseInt(getArgValue("--sample") ?? "20", 10);
const outputRoot = getArgValue("--output-dir")
  ?? path.join(os.homedir(), "Desktop", `math-pdf-latex-audit-${new Date().toISOString().replace(/[:.]/g, "-")}`);

function getArgValue(flag: string): string | null {
  const eqArg = args.find((arg) => arg.startsWith(`${flag}=`));
  if (eqArg) return eqArg.slice(flag.length + 1);

  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }

  return null;
}

function normalizeLatexSyntax(value: string) {
  return value
    .replace(/\\(left|right)\s+([()[\]{}.|])/g, "\\$1$2")
    .replace(/\\sqrt\s+\[/g, "\\sqrt[")
    .replace(/\\(d?frac|tfrac)\s+\{/g, "\\$1{")
    .replace(/\\(sin|cos|tan|log|ln)\s+\{/g, "\\$1{");
}

function balanceBraces(mathText: string) {
  const openBraceCount = (mathText.match(/\{/g) ?? []).length;
  const closeBraceCount = (mathText.match(/\}/g) ?? []).length;
  if (openBraceCount <= closeBraceCount) {
    return mathText;
  }

  return `${mathText}${"}".repeat(openBraceCount - closeBraceCount)}`;
}

function balanceDelimitedMathBraces(value: string) {
  return value
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, mathText: string) => `\\(${balanceBraces(mathText)}\\)`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, mathText: string) => `\\[${balanceBraces(mathText)}\\]`)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, mathText: string) => `$$${balanceBraces(mathText)}$$`)
    .replace(/(?<!\\)\$(?!\$)([^$\n]+?)\$/g, (_match, mathText: string) => `$${balanceBraces(mathText)}$`);
}

function repairLostExponentNotation(value: string) {
  return value
    .replace(/(\(\d+(?:\.\d+)?\))(\d*x(?:[−-]\d+)?)/g, "$1^{$2}")
    .replace(/(\([^()\n<>]+\)|[A-Za-z]\([^()\n<>]+\))2/g, "$1^2")
    .replace(/(?<![\d.])([A-Za-z])([23])(?=[−\-+)=,;.\s<]|$)/g, "$1^$2");
}

function wrapObviousMathRuns(value: string) {
  let next = value.replace(
    /(^|<br>)([A-Za-z]\([^<]*?=[^<]+?)(?=<br>|$)/g,
    (match, prefix: string, expression: string) => {
      if (expression.trim().startsWith("\\(")) {
        return match;
      }

      return `${prefix}\\(${expression.trim()}\\)`;
    },
  );

  next = next.replace(
    /(?<!\\\()(\([xy][^()\n<>]*?[−-]\d+\)\^2\+\([xy][^()\n<>]*?[−-]\d+\)\^2=\d+)(?!\\\))/g,
    "\\($1\\)",
  );

  const trimmed = next.trim();
  if (
    trimmed === next
    && !trimmed.startsWith("\\(")
    && /^[A-Za-z]\([A-Za-z]\)=/.test(trimmed)
  ) {
    next = `\\(${trimmed}\\)`;
  }

  return next;
}

function applyDeterministicTextFix(value: string, field: string) {
  let next = wrapObviousMathRuns(repairLostExponentNotation(balanceDelimitedMathBraces(normalizeLatexSyntax(value))));
  const dollarSuggestion = getMathDollarSuggestion(next, field, { requireMathSignal: false });
  if (dollarSuggestion?.updatedFields[field]) {
    next = dollarSuggestion.updatedFields[field];
  }

  return next;
}

function validateKatex(value: string) {
  const normalized = normalizeMathDelimiters(value);
  const errors: string[] = [];

  for (const segment of tokenizeHtmlLatexContent(normalized)) {
    if (segment.type !== "math") {
      continue;
    }

    const html = katex.renderToString(segment.value.trim(), {
      displayMode: segment.delimiter === "$$" || segment.delimiter === "\\[",
      throwOnError: false,
      strict: "ignore",
      output: "html",
    });

    if (html.includes("katex-error")) {
      errors.push(segment.value.trim());
    }
  }

  return errors;
}

function findAmbiguousSourceLoss(value: string) {
  const inspectedValue = value.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
  if (/^\d+(?:\.\d+)?e[+-]?\d+$/i.test(inspectedValue.trim())) {
    return [];
  }

  const findings: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/[A-Za-z]\d(?:\s*[+\-−=)]|$)/, "possible missing exponent after variable"],
    [/[)\]}]\d(?:[A-Za-z]|\s*[+\-−=)]|$)/, "possible missing exponent after grouped expression"],
    [/\(\s*\d+(?:\.\d+)?\s*\)\d+[A-Za-z]/, "possible missing exponent in exponential expression"],
  ];

  for (const [pattern, reason] of patterns) {
    if (pattern.test(inspectedValue)) {
      findings.push(reason);
    }
  }

  return findings;
}

function addTextPatch(params: {
  patches: PatchEntry[];
  reviews: ReviewEntry[];
  table: PatchEntry["table"];
  id: string;
  field: string;
  value: string | null | undefined;
  question: QuestionRow;
}) {
  const { patches, reviews, table, id, field, value, question } = params;
  if (!value) {
    return;
  }

  const knownFix = KNOWN_SOURCE_FIXES[question.id]?.[field];
  const next = knownFix ?? applyDeterministicTextFix(value, field);
  const beforeErrors = validateKatex(value);
  const afterErrors = validateKatex(next);
  const ambiguousFindings = findAmbiguousSourceLoss(next);
  const test = question.test_sections?.tests;

  for (const reason of ambiguousFindings) {
    reviews.push({
      questionId: question.id,
      testId: test?.id,
      testTitle: test?.title,
      field,
      reason,
      value: next,
    });
  }

  if (beforeErrors.length > 0 && afterErrors.length > 0) {
    reviews.push({
      questionId: question.id,
      testId: test?.id,
      testTitle: test?.title,
      field,
      reason: `KaTeX errors remain after deterministic fixes: ${afterErrors.join(" | ")}`,
      value: next,
    });
  }

  if (next !== value && afterErrors.length === 0) {
    patches.push({
      table,
      id,
      field,
      originalValue: value,
      mutatedValue: next,
      questionId: question.id,
      testId: test?.id,
      testTitle: test?.title,
    });
  }
}

function repairExtra(extra: unknown, question: QuestionRow, patches: PatchEntry[], reviews: ReviewEntry[]) {
  const normalized = normalizeQuestionExtra(extra);
  if (!normalized || normalized.type !== "table") {
    return;
  }

  const test = question.test_sections?.tests;
  const baseExtra = extra && typeof extra === "object" ? extra as Record<string, unknown> : normalized;
  let nextExtra = extra;
  let changed = false;
  const textValues: Array<{ field: string; value: string }> = [];

  if (typeof normalized.content === "string") {
    const nextContent = applyDeterministicTextFix(normalized.content, "extra.content");
    if (nextContent !== normalized.content && validateKatex(nextContent).length === 0) {
      nextExtra = { ...baseExtra, type: normalized.type, content: nextContent };
      changed = true;
    }
    textValues.push({ field: "extra.content", value: nextContent });
  } else if (normalized.content && typeof normalized.content === "object") {
    const contentObject = normalized.content as { title?: unknown; content?: unknown };
    const nextContentObject = { ...contentObject };

    if (typeof contentObject.title === "string") {
      const nextTitle = applyDeterministicTextFix(contentObject.title, "extra.title");
      if (nextTitle !== contentObject.title && validateKatex(nextTitle).length === 0) {
        nextContentObject.title = nextTitle;
        changed = true;
      }
      textValues.push({ field: "extra.title", value: nextTitle });
    }

    if (typeof contentObject.content === "string") {
      const nextContent = applyDeterministicTextFix(contentObject.content, "extra.content");
      if (nextContent !== contentObject.content && validateKatex(nextContent).length === 0) {
        nextContentObject.content = nextContent;
        changed = true;
      }
      textValues.push({ field: "extra.content", value: nextContent });
    }

    if (changed) {
      nextExtra = { ...baseExtra, type: normalized.type, content: nextContentObject };
    }
  }

  for (const textValue of textValues) {
    for (const reason of findAmbiguousSourceLoss(textValue.value)) {
      reviews.push({
        questionId: question.id,
        testId: test?.id,
        testTitle: test?.title,
        field: textValue.field,
        reason,
        value: textValue.value,
      });
    }
  }

  if (!changed) {
    return;
  }

  patches.push({
    table: "questions",
    id: question.id,
    field: "extra",
    originalValue: extra,
    mutatedValue: nextExtra,
    questionId: question.id,
    testId: test?.id,
    testTitle: test?.title,
  });
}

async function fetchMathQuestions() {
  const supabase = createSupabaseAdminClient();
  const pageSize = 1000;
  const rows: QuestionRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("questions")
      .select(
        `
          id,
          question_text,
          passage,
          explanation,
          extra,
          question_options (
            id,
            option_text,
            display_order
          ),
          question_spr_accepted_answers (
            id,
            accepted_answer,
            display_order
          ),
          test_sections!inner (
            name,
            module_number,
            tests!inner (
              id,
              title,
              visibility
            )
          )
        `,
      )
      .eq("test_sections.name", MATH_SECTION)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<QuestionRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) {
      break;
    }
  }

  return rows;
}

async function writeReports(patches: PatchEntry[], reviews: ReviewEntry[]) {
  await mkdir(outputRoot, { recursive: true });
  const backupPath = path.join(outputRoot, "backup.json");
  const diffPath = path.join(outputRoot, "diff.json");
  const reviewPath = path.join(outputRoot, "needs_review.json");

  await writeFile(backupPath, JSON.stringify(patches.map((patch) => ({
    ...patch,
    mutatedValue: patch.originalValue,
  })), null, 2), "utf8");
  await writeFile(diffPath, JSON.stringify(patches, null, 2), "utf8");
  await writeFile(reviewPath, JSON.stringify(reviews, null, 2), "utf8");

  return { backupPath, diffPath, reviewPath };
}

async function applyPatches(patches: PatchEntry[]) {
  const supabase = createSupabaseAdminClient();

  for (const patch of patches) {
    const { error } = await supabase
      .from(patch.table)
      .update({ [patch.field]: patch.mutatedValue })
      .eq("id", patch.id);

    if (error) {
      throw new Error(`Failed to update ${patch.table}.${patch.field} ${patch.id}: ${error.message}`);
    }
  }
}

async function main() {
  const questions = await fetchMathQuestions();
  const patches: PatchEntry[] = [];
  const reviews: ReviewEntry[] = [];

  for (const question of questions) {
    addTextPatch({ patches, reviews, table: "questions", id: question.id, field: "question_text", value: question.question_text, question });
    addTextPatch({ patches, reviews, table: "questions", id: question.id, field: "passage", value: question.passage, question });
    addTextPatch({ patches, reviews, table: "questions", id: question.id, field: "explanation", value: question.explanation, question });
    repairExtra(question.extra, question, patches, reviews);

    for (const option of question.question_options ?? []) {
      addTextPatch({ patches, reviews, table: "question_options", id: option.id, field: "option_text", value: option.option_text, question });
    }

    for (const answer of question.question_spr_accepted_answers ?? []) {
      addTextPatch({ patches, reviews, table: "question_spr_accepted_answers", id: answer.id, field: "accepted_answer", value: answer.accepted_answer, question });
    }
  }

  const reports = await writeReports(patches, reviews);

  console.log(JSON.stringify({
    mode: execute ? "execute" : "dry-run",
    mathQuestions: questions.length,
    deterministicPatches: patches.length,
    needsReview: reviews.length,
    outputRoot,
    reports,
    samplePatches: patches.slice(0, Number.isFinite(sampleLimit) ? sampleLimit : 20).map((patch) => ({
      table: patch.table,
      id: patch.id,
      field: patch.field,
      questionId: patch.questionId,
      testTitle: patch.testTitle,
    })),
    sampleNeedsReview: reviews.slice(0, Number.isFinite(sampleLimit) ? sampleLimit : 20).map((review) => ({
      questionId: review.questionId,
      field: review.field,
      reason: review.reason,
      testTitle: review.testTitle,
    })),
  }, null, 2));

  if (!execute) {
    console.log("Dry run only. Re-run with --execute to update Supabase.");
    return;
  }

  await applyPatches(patches);
  console.log(`Updated ${patches.length} Math content field(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
