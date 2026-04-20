import { z } from "zod";

import type { AppSession } from "@/lib/auth/session";
import dbConnect from "@/lib/mongodb";
import TestManagerBoard from "@/lib/models/TestManagerBoard";
import { QuestionValidationSchema } from "@/lib/schema/question";
import { normalizeSectionName } from "@/lib/sections";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emptyTestManagerBoard, normalizeTestManagerBoard, type TestManagerCard } from "@/lib/testManagerBoard";

const TEST_MANAGER_BOARD_KEY = "global";
const PUBLIC_EXAM_EDIT_PERMISSION = "edit_public_exams";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QuestionRow = {
  id: string;
  legacy_mongo_id: string | null;
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
  question_options:
    | Array<{
        id: string;
        option_text: string;
        display_order: number;
      }>
    | null;
  question_correct_options:
    | {
        option_id: string;
      }
    | null;
  question_spr_accepted_answers:
    | Array<{
        accepted_answer: string;
        display_order: number;
      }>
    | null;
  test_sections:
    | {
        id: string;
        test_id: string;
        name: string;
        module_number: number | null;
      }
    | null;
};

type TestRow = {
  id: string;
  legacy_mongo_id: string | null;
  title: string;
  visibility: "public" | "private";
  status: string;
};

type EditableQuestionPayload = z.infer<typeof QuestionValidationSchema>;

export type ReportedQuestionEditorData = {
  card: TestManagerCard;
  question: EditableQuestionPayload & {
    questionId: string;
    testTitle: string;
    visibility: "public" | "private";
    status: string;
  };
};

class TestManagerQuestionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function requirePublicExamEditor(session: AppSession) {
  if (session.user.permissions.includes(PUBLIC_EXAM_EDIT_PERMISSION)) {
    return;
  }

  throw new TestManagerQuestionError(403, "You do not have permission to edit public exams.");
}

async function getBoardCard(cardId: string) {
  await dbConnect();

  const document = await TestManagerBoard.findOneAndUpdate(
    { key: TEST_MANAGER_BOARD_KEY },
    { $setOnInsert: { board: emptyTestManagerBoard } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const board = normalizeTestManagerBoard(document.board);
  const card = board.cards[cardId];

  if (!card) {
    throw new TestManagerQuestionError(404, "Reported question not found.");
  }

  return { board, card, document };
}

async function getQuestionRow(card: TestManagerCard) {
  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("questions")
    .select(
      `
        id,
        legacy_mongo_id,
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
          id,
          test_id,
          name,
          module_number
        )
      `,
    );
  const { data, error } = await (isUuid(card.questionId)
    ? query.eq("id", card.questionId)
    : query.eq("legacy_mongo_id", card.questionId)).maybeSingle<QuestionRow>();

  if (error || !data) {
    throw new TestManagerQuestionError(404, "Question not found.");
  }

  return data;
}

async function getTestRow(testId: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("tests")
    .select("id,legacy_mongo_id,title,visibility,status")
  const { data, error } = await (isUuid(testId) ? query.eq("id", testId) : query.eq("legacy_mongo_id", testId)).maybeSingle<TestRow>();

  if (error || !data) {
    throw new TestManagerQuestionError(404, "Test not found.");
  }

  return data;
}

function buildEditorQuestion(question: QuestionRow, test: TestRow): ReportedQuestionEditorData["question"] {
  const sortedOptions = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
  const sortedSprAnswers = [...(question.question_spr_accepted_answers ?? [])].sort(
    (left, right) => left.display_order - right.display_order,
  );
  const correctOption = question.question_correct_options
    ? sortedOptions.find((option) => option.id === question.question_correct_options?.option_id)
    : null;

  return {
    questionId: question.id,
    testId: question.test_sections?.test_id ?? test.id,
    testTitle: test.title,
    visibility: test.visibility,
    status: test.status,
    section: question.test_sections?.name ?? "Reading and Writing",
    domain: question.domain ?? "",
    skill: question.skill ?? "",
    module: question.test_sections?.module_number ?? 1,
    questionType: question.question_type,
    questionText: question.question_text,
    passage: question.passage ?? "",
    choices: sortedOptions.map((option) => option.option_text),
    correctAnswer: correctOption?.option_text ?? "",
    sprAnswers: sortedSprAnswers.map((answer) => answer.accepted_answer),
    explanation: question.explanation,
    difficulty: question.difficulty,
    points: question.points,
    imageUrl: question.image_url ?? "",
    extra: (question.extra as EditableQuestionPayload["extra"] | null | undefined) ?? undefined,
  };
}

function assertEditablePublicTest(test: TestRow) {
  if (test.visibility !== "public") {
    throw new TestManagerQuestionError(403, "Only public tests can be opened from the reported questions board.");
  }
}

async function resolveEditorTarget(cardId: string, session: AppSession) {
  requirePublicExamEditor(session);

  const { board, card, document } = await getBoardCard(cardId);
  const question = await getQuestionRow(card);
  const test = await getTestRow(question.test_sections?.test_id ?? card.testId);

  assertEditablePublicTest(test);

  return { board, card, document, question, test };
}

async function ensureSectionId(testId: string, sectionName: string, module: number, timeLimitMinutes = 32) {
  const supabase = createSupabaseAdminClient();
  const normalizedSection = normalizeSectionName(sectionName);
  const { data: existing, error: existingError } = await supabase
    .from("test_sections")
    .select("id")
    .eq("test_id", testId)
    .eq("name", normalizedSection)
    .eq("module_number", module)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new TestManagerQuestionError(500, existingError.message);
  }

  if (existing) {
    return existing.id;
  }

  const { count, error: countError } = await supabase
    .from("test_sections")
    .select("id", { count: "exact", head: true })
    .eq("test_id", testId);

  if (countError) {
    throw new TestManagerQuestionError(500, countError.message);
  }

  const { data: created, error: createError } = await supabase
    .from("test_sections")
    .insert({
      test_id: testId,
      name: normalizedSection,
      module_number: module,
      display_order: (count ?? 0) + 1,
      question_count: 0,
      time_limit_minutes: timeLimitMinutes,
    })
    .select("id")
    .single<{ id: string }>();

  if (createError || !created) {
    throw new TestManagerQuestionError(500, createError?.message ?? "Failed to create test section.");
  }

  return created.id;
}

function normalizeQuestionPayload(payload: EditableQuestionPayload) {
  return {
    ...payload,
    section: normalizeSectionName(payload.section),
    domain: payload.domain?.trim() ? payload.domain.trim() : undefined,
    skill: payload.skill?.trim() ? payload.skill.trim() : undefined,
    passage: payload.passage?.trim() ? payload.passage.trim() : undefined,
    imageUrl: payload.imageUrl?.trim() ? payload.imageUrl.trim() : undefined,
    choices: payload.choices?.map((choice) => choice.trim()).filter(Boolean),
    correctAnswer: payload.correctAnswer?.trim() ? payload.correctAnswer.trim() : undefined,
    sprAnswers: payload.sprAnswers?.map((answer) => answer.trim()).filter(Boolean),
  };
}

async function replaceQuestionAnswers(questionId: string, payload: ReturnType<typeof normalizeQuestionPayload>) {
  const supabase = createSupabaseAdminClient();

  const [{ error: deleteCorrectError }, { error: deleteOptionsError }, { error: deleteSprError }] = await Promise.all([
    supabase.from("question_correct_options").delete().eq("question_id", questionId),
    supabase.from("question_options").delete().eq("question_id", questionId),
    supabase.from("question_spr_accepted_answers").delete().eq("question_id", questionId),
  ]);

  const deleteError = deleteCorrectError ?? deleteOptionsError ?? deleteSprError;
  if (deleteError) {
    throw new TestManagerQuestionError(500, deleteError.message);
  }

  if (payload.questionType === "multiple_choice") {
    const choices = payload.choices ?? [];
    const correctAnswer = payload.correctAnswer ?? "";

    if (choices.length === 0) {
      throw new TestManagerQuestionError(400, "Multiple-choice questions need at least one choice.");
    }

    if (!choices.includes(correctAnswer)) {
      throw new TestManagerQuestionError(400, "The correct answer must exactly match one of the choices.");
    }

    const { data: options, error: optionError } = await supabase
      .from("question_options")
      .insert(
        choices.map((choice, index) => ({
          question_id: questionId,
          option_code: `choice_${index}`,
          option_text: choice,
          display_order: index + 1,
        })),
      )
      .select("id,option_text");

    if (optionError || !options) {
      throw new TestManagerQuestionError(500, optionError?.message ?? "Failed to save choices.");
    }

    const matchedOption = options.find((option) => option.option_text === correctAnswer);
    if (!matchedOption) {
      throw new TestManagerQuestionError(400, "The correct answer must exactly match one of the choices.");
    }

    const { error: correctOptionError } = await supabase.from("question_correct_options").insert({
      question_id: questionId,
      option_id: matchedOption.id,
    });

    if (correctOptionError) {
      throw new TestManagerQuestionError(500, correctOptionError.message);
    }

    return;
  }

  const sprAnswers = payload.sprAnswers ?? [];
  if (sprAnswers.length === 0) {
    throw new TestManagerQuestionError(400, "SPR questions need at least one accepted answer.");
  }

  const { error: sprError } = await supabase.from("question_spr_accepted_answers").insert(
    sprAnswers.map((answer, index) => ({
      question_id: questionId,
      accepted_answer: answer,
      display_order: index + 1,
    })),
  );

  if (sprError) {
    throw new TestManagerQuestionError(500, sprError.message);
  }
}

export const testManagerQuestionService = {
  async getEditorData(cardId: string, session: AppSession): Promise<ReportedQuestionEditorData> {
    const { card, question, test } = await resolveEditorTarget(cardId, session);

    return {
      card,
      question: buildEditorQuestion(question, test),
    };
  },

  async updateQuestion(cardId: string, data: unknown, session: AppSession): Promise<ReportedQuestionEditorData> {
    const payload = normalizeQuestionPayload(QuestionValidationSchema.parse(data));
    const { board, card, document, question, test } = await resolveEditorTarget(cardId, session);
    const supabase = createSupabaseAdminClient();

    const { data: currentSection } = await supabase
      .from("test_sections")
      .select("time_limit_minutes")
      .eq("id", question.section_id)
      .maybeSingle<{ time_limit_minutes: number | null }>();

    const sectionId = await ensureSectionId(test.id, payload.section, payload.module, currentSection?.time_limit_minutes ?? 32);

    const { error: updateError } = await supabase
      .from("questions")
      .update({
        section_id: sectionId,
        question_type: payload.questionType,
        question_text: payload.questionText,
        passage: payload.passage ?? null,
        explanation: payload.explanation,
        difficulty: payload.difficulty,
        points: payload.points,
        domain: payload.domain ?? null,
        skill: payload.skill ?? null,
        image_url: payload.imageUrl ?? null,
        extra: payload.extra ?? null,
      })
      .eq("id", question.id);

    if (updateError) {
      throw new TestManagerQuestionError(500, updateError.message);
    }

    await replaceQuestionAnswers(question.id, payload);

    const nextCard: TestManagerCard = {
      ...card,
      section: payload.section,
      module: payload.module,
    };

    document.board = {
      ...board,
      cards: {
        ...board.cards,
        [card.id]: nextCard,
      },
    };
    await document.save();

    const nextQuestion = await getQuestionRow(nextCard);
    return {
      card: nextCard,
      question: buildEditorQuestion(nextQuestion, test),
    };
  },
};

export function getTestManagerQuestionErrorStatus(error: unknown) {
  return error instanceof TestManagerQuestionError ? error.status : 500;
}

export function getTestManagerQuestionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return "Invalid question payload.";
  }

  return error instanceof Error ? error.message : "Failed to load reported question.";
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}
