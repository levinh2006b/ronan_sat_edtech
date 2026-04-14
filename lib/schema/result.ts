import { z } from "zod";

import { LEGACY_VERBAL_SECTION, MATH_SECTION, normalizeSectionName, VERBAL_SECTION } from "@/lib/sections";

const VALID_SECTIONAL_SUBJECTS = [VERBAL_SECTION, LEGACY_VERBAL_SECTION, MATH_SECTION];

const SectionalSubjectSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => value === undefined || VALID_SECTIONAL_SUBJECTS.includes(value), {
    message: `sectionalSubject must be one of: ${VALID_SECTIONAL_SUBJECTS.join(", ")}`,
  })
  .transform((value) => (value ? normalizeSectionName(value) : undefined));

export const AnswerValidationSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  userAnswer: z.string().trim().max(200).optional().nullable(),
  isCorrect: z.boolean().optional(),
});

export const ResultValidationSchema = z
  .object({
    userId: z.string().min(1, "User ID is required").optional(),
    testId: z.string().min(1, "Test ID is required"),
    answers: z.array(AnswerValidationSchema).min(1).max(200),
    isSectional: z.boolean().optional(),
    sectionalSubject: SectionalSubjectSchema,
    sectionalModule: z.number().int().min(1).max(2).optional(),
    score: z.number().min(0).optional(),
    sectionBreakdown: z
      .object({
        readingAndWriting: z.number().min(0).optional(),
        math: z.number().min(0).optional(),
      })
      .optional(),
    totalScore: z.number().optional(),
    readingScore: z.number().optional(),
    mathScore: z.number().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.isSectional) {
      if (!value.sectionalSubject) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "sectionalSubject is required for sectional results",
          path: ["sectionalSubject"],
        });
      }

      if (!value.sectionalModule) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "sectionalModule is required for sectional results",
          path: ["sectionalModule"],
        });
      }
    }
  });

export type ResultInput = z.infer<typeof ResultValidationSchema>;
