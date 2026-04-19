import mongoose from "mongoose";

import dbConnect from "@/lib/mongodb";
import Question from "@/lib/models/Question";
import Result from "@/lib/models/Result";
import { isVerbalSection } from "@/lib/sections";
import Test from "@/lib/models/Test";
import User from "@/lib/models/User";
import { ResultValidationSchema } from "@/lib/schema/result";
import type { ReviewAnswer, ReviewErrorLogEntry, ReviewErrorLogPage, ReviewErrorLogStatus } from "@/types/review";

type ValidatedAnswer = {
  questionId: string;
  userAnswer?: string | null;
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getChoiceIndexFromCode(value?: string | null) {
  const match = value?.match(/^choice_(\d+)$/i);
  return match ? Number(match[1]) : -1;
}

function normalizeAnswer(value?: string | null) {
  return value?.trim() || "Omitted";
}

function isAnswerCorrect(
  question: {
    questionType?: string;
    correctAnswer?: string;
    choices?: string[];
    sprAnswers?: string[];
  },
  userAnswer: string
) {
  if (!userAnswer || userAnswer === "Omitted") {
    return false;
  }

  if (question.questionType === "spr") {
    return (
      question.sprAnswers?.some((accepted) => accepted.trim().toLowerCase() === userAnswer.trim().toLowerCase()) ??
      false
    );
  }

  const correctAnswer = question.correctAnswer ?? "";
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const userChoiceIndex = getChoiceIndexFromCode(userAnswer);
  const correctChoiceIndex = getChoiceIndexFromCode(correctAnswer);

  if (userChoiceIndex >= 0 && correctChoiceIndex >= 0) {
    return userChoiceIndex === correctChoiceIndex;
  }

  if (userChoiceIndex >= 0 && correctChoiceIndex < 0) {
    return normalizeText(choices[userChoiceIndex]) === normalizeText(correctAnswer);
  }

  if (userChoiceIndex < 0 && correctChoiceIndex >= 0) {
    return normalizeText(userAnswer) === normalizeText(choices[correctChoiceIndex]);
  }

  return normalizeText(userAnswer) === normalizeText(correctAnswer);
}

function buildDateFilter(days?: number) {
  if (!days || !Number.isFinite(days) || days <= 0 || days > 365) {
    return undefined;
  }

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  return { $gte: dateLimit };
}

function clampFullLengthSectionScore(score: number, hasSection: boolean) {
  if (!hasSection) {
    return 0;
  }

  return Math.max(200, Math.min(800, score));
}

function isAnswerOmitted(answer: { userAnswer?: string | null }) {
  return !answer.userAnswer || answer.userAnswer === "" || answer.userAnswer === "Omitted";
}

function getErrorLogOutcome(answer: { isCorrect: boolean; userAnswer?: string | null }) {
  if (isAnswerOmitted(answer)) {
    return "omitted" as const;
  }

  return answer.isCorrect ? ("correct" as const) : ("wrong" as const);
}

function toDifficultyLabel(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function matchesErrorLogQuery(row: ReviewErrorLogEntry, query: string) {
  if (!query) {
    return true;
  }

  return [row.questionId, row.testTitle, row.domain, row.skill, row.difficulty, row.reason || ""]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function toIsoTimestamp(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function getPopulatedTestTitle(testValue: unknown) {
  if (testValue && typeof testValue === "object" && "title" in testValue && typeof testValue.title === "string") {
    return testValue.title;
  }

  return "Untitled Test";
}

function getPopulatedTestId(testValue: unknown) {
  if (testValue && typeof testValue === "object" && "_id" in testValue && testValue._id) {
    return String(testValue._id);
  }

  return undefined;
}

export const resultService = {
  async createResult(userId: string, data: unknown) {
    const validatedData = ResultValidationSchema.parse(data);

    if (!mongoose.Types.ObjectId.isValid(validatedData.testId)) {
      throw new Error("Invalid test ID");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const testObjectId = new mongoose.Types.ObjectId(validatedData.testId);

    await dbConnect();

    const [test, userExists] = await Promise.all([
      Test.findById(validatedData.testId).lean(),
      User.exists({ _id: userObjectId }),
    ]);

    if (!test) {
      throw new Error("Test not found");
    }

    if (!userExists) {
      throw new Error("User not found");
    }

    const answerIds = validatedData.answers.map((answer) => answer.questionId);
    if (answerIds.length === 0 || answerIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw new Error("Invalid answers payload");
    }

    const questions = await Question.find({
      _id: { $in: answerIds },
      testId: validatedData.testId,
    }).lean();

    if (questions.length !== answerIds.length) {
      throw new Error("One or more questions are invalid for this test");
    }

    const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

    const gradedAnswers = validatedData.answers.map((answer: ValidatedAnswer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new Error("Question mismatch detected");
      }

      const normalizedUserAnswer = normalizeAnswer(answer.userAnswer);
      const isCorrect = isAnswerCorrect(question, normalizedUserAnswer);

      return {
        questionId: question._id,
        userAnswer: normalizedUserAnswer,
        isCorrect,
      };
    });

    const isSectional = Boolean(validatedData.isSectional);
    const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;

    let score: number | undefined;
    let sectionBreakdown: { readingAndWriting?: number; math?: number } | undefined;
    let totalScore: number | undefined;
    let readingScore: number | undefined;
    let mathScore: number | undefined;

    if (isSectional) {
      totalScore = correctCount;
      readingScore = isVerbalSection(validatedData.sectionalSubject) ? correctCount : 0;
      mathScore = validatedData.sectionalSubject === "Math" ? correctCount : 0;
    } else {
      let readingWrongPoints = 0;
      let mathWrongPoints = 0;
      let hasReadingSection = false;
      let hasMathSection = false;

      gradedAnswers.forEach((answer) => {
        const question = questionMap.get(answer.questionId.toString());
        const points = question?.points ?? 0;

        if (isVerbalSection(question?.section)) {
          hasReadingSection = true;
          if (!answer.isCorrect) {
            readingWrongPoints += points;
          }
        } else if (question?.section === "Math") {
          hasMathSection = true;
          if (!answer.isCorrect) {
            mathWrongPoints += points;
          }
        }
      });

      readingScore = clampFullLengthSectionScore(800 - readingWrongPoints, hasReadingSection);
      mathScore = clampFullLengthSectionScore(800 - mathWrongPoints, hasMathSection);
      score = readingScore + mathScore;
      totalScore = score;
      sectionBreakdown = {
        readingAndWriting: readingScore,
        math: mathScore,
      };
    }

    const newResult = await Result.create({
      userId: userObjectId,
      testId: testObjectId,
      isSectional,
      sectionalSubject: validatedData.sectionalSubject,
      sectionalModule: validatedData.sectionalModule,
      answers: gradedAnswers,
      score,
      sectionBreakdown,
      totalScore,
      readingScore,
      mathScore,
    });

    const wrongIds = gradedAnswers.filter((answer) => !answer.isCorrect).map((answer) => answer.questionId);
    const userUpdate: {
      $set: { lastTestDate: Date };
      $push: { testsTaken: mongoose.Types.ObjectId };
      $addToSet?: { wrongQuestions: { $each: mongoose.Types.ObjectId[] } };
      $max?: { highestScore: number };
    } = {
      $set: { lastTestDate: new Date() },
      $push: { testsTaken: testObjectId },
    };

    if (!isSectional && typeof score === "number") {
      userUpdate.$max = { highestScore: score };
    }

    if (wrongIds.length > 0) {
      userUpdate.$addToSet = {
        wrongQuestions: {
          $each: wrongIds,
        },
      };
    }

    try {
      await User.updateOne({ _id: userObjectId }, userUpdate);
    } catch (userUpdateError) {
      console.error("User stats update failed after result creation", userUpdateError);
    }

    return newResult;
  },

  async getUserResults(userId: string, days?: number) {
    await dbConnect();

    const query: {
      userId: string;
      createdAt?: { $gte: Date };
    } = { userId };

    const createdAtFilter = buildDateFilter(days);
    if (createdAtFilter) {
      query.createdAt = createdAtFilter;
    }

    const results = await Result.find(query)
      .sort({ createdAt: -1 })
      .populate("testId", "title")
      .populate({
        path: "answers.questionId",
        model: "Question",
        select: "questionText correctAnswer _id choices passage domain skill difficulty questionType sprAnswers section module extra",
      });

    return { results };
  },

  async getUserErrorLogPage(
    userId: string,
    options: {
      testType?: "full" | "sectional";
      status?: "all" | ReviewErrorLogStatus;
      query?: string;
      offset?: number;
      limit?: number;
    } = {},
  ) {
    await dbConnect();

    const testType = options.testType === "sectional" ? "sectional" : "full";
    const statusFilter = options.status === "wrong" || options.status === "omitted" ? options.status : "all";
    const normalizedQuery = options.query?.trim().toLowerCase() ?? "";
    const offset = Number.isFinite(options.offset) ? Math.max(0, options.offset ?? 0) : 0;
    const limit = Number.isFinite(options.limit) ? Math.min(Math.max(1, options.limit ?? 20), 50) : 20;
    const targetCount = offset + limit + 1;
    const resultBatchSize = 8;

    const query: {
      userId: string;
      isSectional?: true | { $ne: true };
    } = { userId };

    query.isSectional = testType === "sectional" ? true : { $ne: true };

    const collectedRows: ReviewErrorLogEntry[] = [];
    let resultOffset = 0;

    while (collectedRows.length < targetCount) {
      const results = await Result.find(query)
        .sort({ createdAt: -1 })
        .skip(resultOffset)
        .limit(resultBatchSize)
        .populate("testId", "title")
        .populate({
          path: "answers.questionId",
          model: "Question",
          select: "questionText correctAnswer _id choices passage domain skill difficulty questionType sprAnswers section module extra",
        })
        .lean();

      if (results.length === 0) {
        break;
      }

      resultOffset += results.length;

      for (const result of results) {
        const answers = Array.isArray(result.answers) ? result.answers : [];

        for (let index = 0; index < answers.length; index += 1) {
          const answer = answers[index] as unknown as ReviewAnswer;
          const questionId = answer.questionId?._id ? String(answer.questionId._id) : "";
          if (!questionId) {
            continue;
          }

          const outcome = getErrorLogOutcome(answer);
          if (outcome === "correct") {
            continue;
          }

          if (statusFilter !== "all" && outcome !== statusFilter) {
            continue;
          }

          const row: ReviewErrorLogEntry = {
            key: `${String(result._id)}-${questionId}-${index}`,
            resultId: String(result._id),
            questionId,
            questionNumber: index + 1,
            testId: getPopulatedTestId(result.testId),
            timestamp: toIsoTimestamp(result.date) || toIsoTimestamp(result.createdAt),
            testTitle: getPopulatedTestTitle(result.testId),
            domain: answer.questionId?.domain || answer.questionId?.subject || "Uncategorized",
            skill: answer.questionId?.skill || "General",
            difficulty: toDifficultyLabel(answer.questionId?.difficulty),
            reason: answer.errorReason,
            status: outcome,
            answer,
          };

          if (!matchesErrorLogQuery(row, normalizedQuery)) {
            continue;
          }

          collectedRows.push(row);
          if (collectedRows.length >= targetCount) {
            break;
          }
        }

        if (collectedRows.length >= targetCount) {
          break;
        }
      }
    }

    const rows = collectedRows.slice(offset, offset + limit);
    const hasMore = collectedRows.length > offset + limit;

    const response: ReviewErrorLogPage = {
      rows,
      hasMore,
      nextOffset: offset + rows.length,
    };

    return response;
  },

  async updateAnswerReason(userId: string, resultId: string, questionId: string, reason?: string) {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(resultId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      throw new Error("Invalid result reason payload");
    }

    const normalizedReason = reason?.trim();
    const update = normalizedReason
      ? { $set: { "answers.$.errorReason": normalizedReason } }
      : { $unset: { "answers.$.errorReason": "" } };

    const updateResult = await Result.updateOne(
      {
        _id: resultId,
        userId,
        "answers.questionId": questionId,
      },
      update,
    );

    if (updateResult.matchedCount === 0) {
      throw new Error("Result answer not found");
    }

    return {
      resultId,
      questionId,
      reason: normalizedReason,
    };
  },
};
