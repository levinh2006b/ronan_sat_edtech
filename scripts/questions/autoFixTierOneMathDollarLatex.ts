import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getMathDollarSuggestion,
  hasFinancialKeywordContext,
  hasRiskyDollarMath,
  isTierOneMathDollarAutoFixCandidate,
} from "@/lib/testManagerReview";

type QuestionRow = {
  id: string;
  question_text: string;
  passage: string | null;
  explanation: string;
  domain: string | null;
  skill: string | null;
  question_options: Array<{
    id: string;
    option_text: string;
    display_order: number;
  }> | null;
  test_sections: {
    name: string;
    module_number: number | null;
    tests: {
      title: string;
      visibility: "public" | "private";
    } | null;
  } | null;
};

type QuestionPatch = {
  id: string;
  title: string;
  questionNumberLabel: string;
  questionUpdate: {
    question_text?: string;
    passage?: string | null;
    explanation?: string;
  };
  optionUpdates: Array<{
    id: string;
    option_text: string;
  }>;
};

const execute = process.argv.includes("--execute");
const sampleLimit = Number.parseInt(process.argv.find((arg) => arg.startsWith("--sample="))?.split("=")[1] ?? "12", 10);

function applySafeMathDollarFix(value: string, field: string) {
  return getMathDollarSuggestion(value, field, { requireMathSignal: false })?.updatedFields[field] ?? value;
}

function buildPatch(row: QuestionRow): QuestionPatch | null {
  const choices = [...(row.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
  const input = {
    questionText: row.question_text,
    passage: row.passage ?? "",
    explanation: row.explanation,
    domain: row.domain ?? "",
    skill: row.skill ?? "",
    choices: choices.map((choice) => choice.option_text),
  };

  if (!isTierOneMathDollarAutoFixCandidate(input)) {
    return null;
  }

  const nextQuestionText = applySafeMathDollarFix(row.question_text, "questionText");
  const nextPassage = row.passage ? applySafeMathDollarFix(row.passage, "passage") : row.passage;
  const nextExplanation = applySafeMathDollarFix(row.explanation, "explanation");
  const questionUpdate: QuestionPatch["questionUpdate"] = {};

  if (nextQuestionText !== row.question_text) {
    questionUpdate.question_text = nextQuestionText;
  }
  if (nextPassage !== row.passage) {
    questionUpdate.passage = nextPassage;
  }
  if (nextExplanation !== row.explanation) {
    questionUpdate.explanation = nextExplanation;
  }

  const optionUpdates = choices
    .map((choice) => ({
      id: choice.id,
      option_text: applySafeMathDollarFix(choice.option_text, `choice-${choice.id}`),
      original: choice.option_text,
    }))
    .filter((choice) => choice.option_text !== choice.original)
    .map(({ id, option_text }) => ({ id, option_text }));

  if (Object.keys(questionUpdate).length === 0 && optionUpdates.length === 0) {
    return null;
  }

  return {
    id: row.id,
    title: row.test_sections?.tests?.title ?? "Untitled test",
    questionNumberLabel: `${row.test_sections?.name ?? "Unknown"} M${row.test_sections?.module_number ?? "?"}`,
    questionUpdate,
    optionUpdates,
  };
}

async function main() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
        id,
        question_text,
        passage,
        explanation,
        domain,
        skill,
        question_options (
          id,
          option_text,
          display_order
        ),
        test_sections!inner (
          name,
          module_number,
          tests!inner (
            title,
            visibility
          )
        )
      `,
    )
    .eq("test_sections.tests.visibility", "public")
    .returns<QuestionRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rowsWithDollar = (data ?? []).filter((row) =>
    [row.question_text, row.passage, row.explanation, ...(row.question_options ?? []).map((choice) => choice.option_text)]
      .filter(Boolean)
      .some((value) => /(?<!\\)\$/.test(value ?? "")),
  );
  const financialOrRisky = rowsWithDollar.filter((row) => {
    const choices = [...(row.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
    const input = {
      questionText: row.question_text,
      passage: row.passage ?? "",
      explanation: row.explanation,
      domain: row.domain ?? "",
      skill: row.skill ?? "",
      choices: choices.map((choice) => choice.option_text),
    };
    return hasFinancialKeywordContext(input) || hasRiskyDollarMath(input);
  });
  const patches = rowsWithDollar.map(buildPatch).filter((patch): patch is QuestionPatch => Boolean(patch));

  console.log(JSON.stringify({
    mode: execute ? "execute" : "dry-run",
    rowsWithDollar: rowsWithDollar.length,
    tierOneAutoFixRows: patches.length,
    tierTwoManualReviewRows: financialOrRisky.length,
  }, null, 2));

  for (const patch of patches.slice(0, Number.isFinite(sampleLimit) ? sampleLimit : 12)) {
    console.log(JSON.stringify({
      id: patch.id,
      title: patch.title,
      question: patch.questionNumberLabel,
      questionFields: Object.keys(patch.questionUpdate),
      optionUpdates: patch.optionUpdates.length,
    }));
  }

  if (!execute) {
    console.log("Dry run only. Re-run with --execute to update Supabase.");
    return;
  }

  for (const patch of patches) {
    if (Object.keys(patch.questionUpdate).length > 0) {
      const { error: updateError } = await supabase.from("questions").update(patch.questionUpdate).eq("id", patch.id);
      if (updateError) {
        throw new Error(`Failed to update question ${patch.id}: ${updateError.message}`);
      }
    }

    for (const option of patch.optionUpdates) {
      const { error: optionError } = await supabase.from("question_options").update({ option_text: option.option_text }).eq("id", option.id);
      if (optionError) {
        throw new Error(`Failed to update option ${option.id}: ${optionError.message}`);
      }
    }
  }

  console.log(`Updated ${patches.length} Tier 1 questions.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

