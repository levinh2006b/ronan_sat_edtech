import { z } from "zod";

import dbConnect from "@/lib/mongodb";
import Question from "@/lib/models/Question";
import Test from "@/lib/models/Test";
import { QuestionValidationSchema } from "@/lib/schema/question";

export const questionService = {
  async getQuestions(testId?: string | null) {
    await dbConnect();

    return testId ? Question.find({ testId }).lean() : Question.find({}).lean();
  },

  async createQuestion(data: unknown) {
    try {
      const validatedData = QuestionValidationSchema.parse(data);
      await dbConnect();

      const test = await Test.findById(validatedData.testId);
      if (!test) {
        throw new Error("Test not found");
      }

      const newQuestion = await Question.create(validatedData);

      if (!test.questions) {
        test.questions = [];
      }

      test.questions.push(newQuestion._id as (typeof test.questions)[number]);
      await test.save();

      return newQuestion;
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
