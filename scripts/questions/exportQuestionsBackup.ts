import { writeFileSync } from "node:fs";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type QuestionRow = {
  id: string;
  question_text: string;
  passage: string | null;
  explanation: string;
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

type BackupEntry = {
  table: "questions" | "question_options";
  id: string;
  field: string;
  originalValue: string;
  mutatedValue: string;
  testTitle?: string;
  sectionName?: string;
};

const args = process.argv.slice(2);

function getArgValue(flag: string): string | null {
  // --flag=value
  const eqArg = args.find((arg) => arg.startsWith(`${flag}=`));
  if (eqArg) return eqArg.slice(flag.length + 1);

  // --flag value
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }

  return null;
}

const outputPath = getArgValue("--output");
const idsRaw = getArgValue("--ids");
const targetIds = idsRaw ? idsRaw.split(",") : null;

async function main() {
  if (!outputPath) {
    console.error("Usage: npx tsx scripts/questions/exportQuestionsBackup.ts --output=PATH [--ids=ID1,ID2]");
    process.exit(1);
  }

  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("questions")
    .select(
      `
        id,
        question_text,
        passage,
        explanation,
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
    .eq("test_sections.tests.visibility", "public");

  if (targetIds && targetIds.length > 0) {
    query = query.in("id", targetIds);
  }

  const { data, error } = await query.returns<QuestionRow[]>();

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`);
  }

  const questions = data ?? [];
  console.log(`Fetched ${questions.length} questions.`);

  const entries: BackupEntry[] = [];

  for (const question of questions) {
    const testTitle = question.test_sections?.tests?.title;
    const sectionName = question.test_sections?.name;

    entries.push({
      table: "questions",
      id: question.id,
      field: "question_text",
      originalValue: question.question_text,
      mutatedValue: question.question_text,
      testTitle,
      sectionName,
    });

    if (question.passage) {
      entries.push({
        table: "questions",
        id: question.id,
        field: "passage",
        originalValue: question.passage,
        mutatedValue: question.passage,
        testTitle,
        sectionName,
      });
    }

    entries.push({
      table: "questions",
      id: question.id,
      field: "explanation",
      originalValue: question.explanation,
      mutatedValue: question.explanation,
      testTitle,
      sectionName,
    });

    for (const option of question.question_options ?? []) {
      entries.push({
        table: "question_options",
        id: option.id,
        field: "option_text",
        originalValue: option.option_text,
        mutatedValue: option.option_text,
        testTitle,
        sectionName,
      });
    }
  }

  writeFileSync(outputPath, JSON.stringify(entries, null, 2), "utf-8");
  console.log(`Exported ${entries.length} backup entries to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
