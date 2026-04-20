
import { z } from "zod";

const QuestionExtraSchema = z.object({
  type: z.enum(["table", "figure_math", "figure_chart", "figure_other"]),
  content: z.unknown(),    // allow to be any type
});

export const QuestionValidationSchema = z.object({
    testId: z.string().min(1, "Test ID is required"),
    section: z.string().min(1, "Section is required"),
    domain: z.string().optional(),
    skill: z.string().optional(),
    module: z.number().min(1).default(1),
    questionType: z.enum(["multiple_choice", "spr"]).default("multiple_choice"),
    questionText: z.string().min(1, "Question text is required"),
    passage: z.string().optional(),
    choices: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
    sprAnswers: z.array(z.string()).optional(),
    explanation: z.string().min(1, "Explanation is required"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    points: z.number().min(0).default(10),
    imageUrl: z.string().optional(),
    extra: QuestionExtraSchema.optional(),
});

// `z.infer` keeps the runtime schema and the TypeScript input type aligned.
export type QuestionInput = z.infer<typeof QuestionValidationSchema>;
