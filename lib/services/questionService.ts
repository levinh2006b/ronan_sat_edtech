import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeScrapedMarkdownHtml } from "@/lib/scrapedQuestionContent";
import { normalizeSectionName } from "@/lib/sections";
import { QuestionValidationSchema } from "@/lib/schema/question";

type RawQuestionRow = {
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
  } | null;
};

function toLegacyQuestionShape(question: RawQuestionRow) {
  const sortedOptions = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
  const sortedSprAnswers = [...(question.question_spr_accepted_answers ?? [])].sort((left, right) => left.display_order - right.display_order);
  const section = question.test_sections;
  const choices = sortedOptions.map((option) => option.option_text);
  const correctOption = question.question_correct_options
    ? sortedOptions.find((option) => option.id === question.question_correct_options?.option_id)
    : null;

  const correctAnswer = correctOption?.option_text;

  return {
    _id: question.id,
    testId: section?.test_id,
    section: section?.name,
    domain: question.domain ?? undefined,
    skill: question.skill ?? undefined,
    module: section?.module_number ?? 1,
    questionType: question.question_type,
    questionText: question.question_text,
    passage: question.passage ?? undefined,
    choices: choices.length > 0 ? choices : undefined,
    correctAnswer,
    sprAnswers: sortedSprAnswers.map((answer) => answer.accepted_answer),
    explanation: question.explanation,
    difficulty: question.difficulty,
    points: question.points,
    imageUrl: question.image_url ?? undefined,
    extra: question.extra ?? undefined,
  };
}

async function syncSectionQuestionCount(supabase: ReturnType<typeof createSupabaseAdminClient>, sectionId: string) {
  const { count, error: countError } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId);

  if (countError) {
    throw new Error(countError.message);
  }

  const { error: updateError } = await supabase
    .from("test_sections")
    .update({ question_count: count ?? 0 })
    .eq("id", sectionId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export const questionService = {
  async getQuestions(testId?: string | null) {
    const supabase = createSupabaseAdminClient();
    const query = supabase
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
            module_number
          )
        `
      )
      .order("position", { ascending: true });

    const response = testId ? await query.eq("test_sections.test_id", testId) : await query;
    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map((question) => toLegacyQuestionShape(question as unknown as RawQuestionRow));
  },

  async createQuestion(data: unknown) {
    try {
      const validatedData = QuestionValidationSchema.parse(data);
      const supabase = createSupabaseAdminClient();
      const normalizedQuestionText = normalizeScrapedMarkdownHtml(validatedData.questionText);
      const normalizedPassage = validatedData.passage ? normalizeScrapedMarkdownHtml(validatedData.passage) : null;
      const normalizedExplanation = normalizeScrapedMarkdownHtml(validatedData.explanation);
      const normalizedChoices = (validatedData.choices ?? []).map((choice) => normalizeScrapedMarkdownHtml(choice));
      const normalizedCorrectAnswer = validatedData.correctAnswer
        ? normalizeScrapedMarkdownHtml(validatedData.correctAnswer)
        : "";

      const normalizedSection = normalizeSectionName(validatedData.section);
      const { data: section, error: sectionError } = await supabase
        .from("test_sections")
        .select("id,test_id,name,module_number,time_limit_minutes")
        .eq("test_id", validatedData.testId)
        .eq("name", normalizedSection)
        .eq("module_number", validatedData.module)
        .maybeSingle();

      let targetSection = section;
      if (sectionError) {
        throw new Error(sectionError.message);
      }

      if (!targetSection) {
        const { data: fallbackTest, error: testError } = await supabase
          .from("tests")
          .select("id,time_limit_minutes")
          .eq("id", validatedData.testId)
          .maybeSingle();

        if (testError || !fallbackTest) {
          throw new Error("Test not found");
        }

        const { count } = await supabase
          .from("test_sections")
          .select("id", { count: "exact", head: true })
          .eq("test_id", validatedData.testId);

        const { data: createdSection, error: createSectionError } = await supabase
          .from("test_sections")
          .insert({
            test_id: validatedData.testId,
            name: normalizedSection,
            module_number: validatedData.module,
            display_order: (count ?? 0) + 1,
            question_count: 0,
            time_limit_minutes: fallbackTest.time_limit_minutes,
          })
          .select("id,test_id,name,module_number,time_limit_minutes")
          .single();

        if (createSectionError || !createdSection) {
          throw new Error(createSectionError?.message ?? "Failed to create section");
        }

        targetSection = createdSection;
      }

      const { count: existingCount } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("section_id", targetSection.id);

      const { data: createdQuestion, error: questionError } = await supabase
        .from("questions")
        .insert({
          section_id: targetSection.id,
          position: (existingCount ?? 0) + 1,
          question_type: validatedData.questionType,
          question_text: normalizedQuestionText,
          passage: normalizedPassage,
          explanation: normalizedExplanation,
          difficulty: validatedData.difficulty,
          points: validatedData.points,
          domain: validatedData.domain ?? null,
          skill: validatedData.skill ?? null,
          image_url: validatedData.imageUrl ?? null,
          extra: validatedData.extra ?? null,
        })
        .select("id")
        .single();

      if (questionError || !createdQuestion) {
        throw new Error(questionError?.message ?? "Failed to create question");
      }

      if (validatedData.questionType === "multiple_choice") {
        const optionRows = normalizedChoices.map((choice, index) => ({
          question_id: createdQuestion.id,
          option_code: `choice_${index}`,
          option_text: choice,
          display_order: index + 1,
        }));

        const { data: options, error: optionError } = await supabase
          .from("question_options")
          .insert(optionRows)
          .select("id,option_text");

        if (optionError || !options) {
          throw new Error(optionError?.message ?? "Failed to create options");
        }

        const matchedOption = options.find((option) => option.option_text === normalizedCorrectAnswer);
        if (!matchedOption) {
          throw new Error("Correct answer must exactly match one inserted option");
        }

        const { error: correctOptionError } = await supabase.from("question_correct_options").insert({
          question_id: createdQuestion.id,
          option_id: matchedOption.id,
        });

        if (correctOptionError) {
          throw new Error(correctOptionError.message);
        }
      } else {
        const sprRows = (validatedData.sprAnswers ?? []).map((answer, index) => ({
          question_id: createdQuestion.id,
          accepted_answer: answer,
          display_order: index + 1,
        }));

        const { error: sprError } = await supabase.from("question_spr_accepted_answers").insert(sprRows);
        if (sprError) {
          throw new Error(sprError.message);
        }
      }

      await syncSectionQuestionCount(supabase, targetSection.id);

      return {
        _id: createdQuestion.id,
      };
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const validationError = new Error("Validation Error") as Error & {
          errors: z.ZodIssue[];
          name: string;
        };
        validationError.errors = error.issues;
        validationError.name = "ZodError";
        throw validationError;
      }

      throw error;
    }
  },
};
