type GradingQuestion = {
  questionType?: string;
  correctAnswer?: string;
  choices?: string[];
  sprAnswers?: string[];
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getChoiceIndexFromCode(value?: string | null) {
  const match = value?.match(/^choice_(\d+)$/i);
  return match ? Number(match[1]) : -1;
}

function isMultipleChoiceCorrect(question: GradingQuestion, userAnswer: string) {
  const correctAnswer = question.correctAnswer ?? "";
  const choices = Array.isArray(question.choices) ? question.choices : [];

  const userChoiceIndex = getChoiceIndexFromCode(userAnswer);
  const correctChoiceIndex = getChoiceIndexFromCode(correctAnswer);

  if (userChoiceIndex >= 0 && correctChoiceIndex >= 0) {
    return userChoiceIndex === correctChoiceIndex;
  }

  if (userChoiceIndex >= 0 && correctChoiceIndex < 0) {
    const selectedChoiceText = choices[userChoiceIndex];
    return normalizeText(selectedChoiceText) === normalizeText(correctAnswer);
  }

  if (userChoiceIndex < 0 && correctChoiceIndex >= 0) {
    const correctChoiceText = choices[correctChoiceIndex];
    return normalizeText(userAnswer) === normalizeText(correctChoiceText);
  }

  return normalizeText(userAnswer) === normalizeText(correctAnswer);
}

export const checkIsCorrect = (question: GradingQuestion, userAnswer: string) => {
  if (!userAnswer || userAnswer === "Omitted") {
    return false;
  }

  if (question.questionType === "spr") {
    return (
      question.sprAnswers?.some((answer) => normalizeText(answer) === normalizeText(userAnswer)) ??
      false
    );
  }

  return isMultipleChoiceCorrect(question, userAnswer);
};

export function getChoiceCode(choiceIndex: number) {
  return `choice_${choiceIndex}`;
}

export function getChoiceTextFromStoredAnswer(question: GradingQuestion, storedAnswer?: string | null) {
  const choiceIndex = getChoiceIndexFromCode(storedAnswer);
  if (choiceIndex >= 0) {
    return question.choices?.[choiceIndex] ?? storedAnswer ?? "";
  }

  return storedAnswer ?? "";
}
