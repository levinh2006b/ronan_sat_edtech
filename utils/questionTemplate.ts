import katex from "katex";
import { marked } from "marked";

type RawQuestion = {
  section?: string;
  module?: number;
  questionType?: "multiple_choice" | "spr";
  questionText?: string;
  passage?: string;
  choices?: string[];
  sprAnswers?: string[];
  correctAnswer?: string;
  imageUrl?: string;
  [key: string]: unknown;
};

type GeneratePDFTemplateParams = {
  testTitle: string;
  questions: RawQuestion[];
  sectionName?: string;
  documentTitle?: string;
};

type AnswerGroup = {
  key: string;
  title: string;
  questions: RawQuestion[];
};

type AnswerEntry = {
  number: number;
  value: string;
};

const SECTION_ORDER: Record<string, number> = {
  "Reading and Writing": 0,
  Math: 1,
};

const ANSWER_GROUP_CONFIG = [
  { key: "Reading and Writing-1", title: "Reading Module 1 Answers", section: "Reading and Writing", module: 1 },
  { key: "Reading and Writing-2", title: "Reading Module 2 Answers", section: "Reading and Writing", module: 2 },
  { key: "Math-1", title: "Math Module 1 Answers", section: "Math", module: 1 },
  { key: "Math-2", title: "Math Module 2 Answers", section: "Math", module: 2 },
];

function parseText(text: string | null | undefined): string {
  if (!text) {
    return "";
  }

  const parsedMath = text.replace(/(\$\$?)(.*?)\1/gs, (match, prefix, mathText) => {
    try {
      return katex.renderToString(mathText.trim(), {
        displayMode: prefix === "$$",
        throwOnError: false,
        output: "mathml",
      });
    } catch {
      return match;
    }
  });

  return marked.parse(parsedMath) as string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function normalizeChoices(question: RawQuestion): string[] {
  if (Array.isArray(question.choices) && question.choices.length > 0) {
    return question.choices.filter((choice): choice is string => Boolean(choice));
  }

  return Object.keys(question)
    .filter((key) => /^choice_\d+$/.test(key))
    .sort((left, right) => Number(left.split("_")[1]) - Number(right.split("_")[1]))
    .map((key) => question[key])
    .filter((choice): choice is string => typeof choice === "string" && choice.trim().length > 0);
}

function resolveImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) {
    return null;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.toLowerCase() === "cần thêm ảnh") {
    return null;
  }

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return trimmed;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return null;
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${encodeURI(trimmed)}`;
}

function getQuestionSortValue(question: RawQuestion): number {
  const rawOrder = question.order;
  if (typeof rawOrder === "number") {
    return rawOrder;
  }

  return 0;
}

function sortQuestions(questions: RawQuestion[]): RawQuestion[] {
  return [...questions].sort((left, right) => {
    const leftSection = SECTION_ORDER[left.section ?? ""] ?? 99;
    const rightSection = SECTION_ORDER[right.section ?? ""] ?? 99;

    if (leftSection !== rightSection) {
      return leftSection - rightSection;
    }

    if ((left.module ?? 0) !== (right.module ?? 0)) {
      return (left.module ?? 0) - (right.module ?? 0);
    }

    return getQuestionSortValue(left) - getQuestionSortValue(right);
  });
}

function formatChoiceAnswer(question: RawQuestion): string {
  const correctAnswer = typeof question.correctAnswer === "string" ? question.correctAnswer.trim() : "";
  const choices = normalizeChoices(question);
  const labels = ["A", "B", "C", "D", "E", "F"];

  const indexedMatch = correctAnswer.match(/^choice_(\d+)$/i);
  if (indexedMatch) {
    const index = Number(indexedMatch[1]);
    return labels[index] ?? String(index + 1);
  }

  const normalizedCorrect = correctAnswer.toLowerCase();
  const foundIndex = choices.findIndex((choice) => choice.trim().toLowerCase() === normalizedCorrect);
  if (foundIndex >= 0) {
    return labels[foundIndex] ?? String(foundIndex + 1);
  }

  return correctAnswer || "N/A";
}

function formatSprAnswer(question: RawQuestion): string {
  const answers = Array.isArray(question.sprAnswers)
    ? question.sprAnswers.filter((answer): answer is string => typeof answer === "string" && answer.trim().length > 0)
    : [];

  if (answers.length > 0) {
    return answers.join(", ");
  }

  if (typeof question.correctAnswer === "string" && question.correctAnswer.trim().length > 0) {
    return question.correctAnswer.trim();
  }

  return "N/A";
}

function formatAnswer(question: RawQuestion): string {
  if (question.questionType === "spr") {
    return formatSprAnswer(question);
  }

  return formatChoiceAnswer(question);
}

function buildQuestionBlock(question: RawQuestion, index: number): string {
  const choices = normalizeChoices(question);
  const labels = ["A", "B", "C", "D", "E", "F"];
  const imageUrl = resolveImageUrl(question.imageUrl);

  const imageHtml = imageUrl
    ? `<div class="question-image-wrap"><img src="${escapeAttribute(imageUrl)}" class="question-image" alt="Question image" /></div>`
    : "";

  const passageHtml = question.passage
    ? `<section class="passage">${parseText(question.passage)}</section>`
    : "";

  const questionTextHtml = question.questionText
    ? `<section class="question-text">${parseText(question.questionText)}</section>`
    : "";

  const choicesHtml =
    question.questionType === "spr"
      ? `
        <div class="spr-box">
          <div class="spr-title">Student-produced response</div>
          <div class="spr-line"></div>
        </div>
      `
      : `
        <ol class="choices">
          ${choices
            .map(
              (choice, choiceIndex) => `
                <li>
                  <span class="choice-label">${labels[choiceIndex] ?? `${choiceIndex + 1}.`}</span>
                  <div class="choice-text">${parseText(choice)}</div>
                </li>
              `
            )
            .join("")}
        </ol>
      `;

  return `
    <article class="question-block">
      <div class="question-meta">
        <span class="question-number">Question ${index + 1}</span>
        <span class="question-tag">${question.section ?? "Unknown section"}</span>
        <span class="question-tag">Module ${question.module ?? "?"}</span>
      </div>
      ${passageHtml}
      ${imageHtml}
      ${questionTextHtml}
      ${choicesHtml}
    </article>
  `;
}

function buildAnswerGroups(questions: RawQuestion[]): AnswerGroup[] {
  return ANSWER_GROUP_CONFIG.map((config) => ({
    key: config.key,
    title: config.title,
    questions: questions.filter(
      (question) => question.section === config.section && question.module === config.module
    ),
  })).filter((group) => group.questions.length > 0);
}

function buildAnswerGroup(group: AnswerGroup): string {
  const entries: AnswerEntry[] = group.questions.map((question, index) => ({
    number: index + 1,
    value: formatAnswer(question),
  }));
  const columnCount = Math.min(4, Math.max(2, Math.ceil(entries.length / 12)));
  const rowsPerColumn = Math.ceil(entries.length / columnCount);
  const columns = Array.from({ length: columnCount }, (_, columnIndex) =>
    entries.slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn)
  ).filter((column) => column.length > 0);

  return `
    <section class="answer-group">
      <h3>${group.title}</h3>
      <div class="answer-columns">
        ${columns
          .map(
            (column) => `
              <div class="answer-column">
                ${column
                  .map(
                    (entry) => `
                      <div class="answer-row">
                        <span class="answer-number">${entry.number}</span>
                        <span class="answer-value">${escapeHtml(entry.value)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function buildAnswerKeyPage(questions: RawQuestion[]): string {
  const groups = buildAnswerGroups(questions);

  return `
    <section class="answer-key-page">
      <div class="answer-watermark">Ronan SAT</div>
      <div class="answer-key-header">
        <div class="answer-key-label">ANSWER KEY</div>
        <h2>Answer Key</h2>
      </div>
      <div class="answer-groups">
        ${groups.map((group) => buildAnswerGroup(group)).join("")}
      </div>
    </section>
  `;
}

export function generatePDFTemplate({
  testTitle,
  questions,
  sectionName,
  documentTitle,
}: GeneratePDFTemplateParams): string {
  const sortedQuestions = sortQuestions(questions);
  const questionsHtml = sortedQuestions.map((question, index) => buildQuestionBlock(question, index)).join("");
  const subtitle = sectionName ? `${sectionName} section` : "Full practice test";
  const answerKeyHtml = buildAnswerKeyPage(sortedQuestions);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(documentTitle || testTitle)}</title>
        <style>
          @page {
            size: A4;
            margin: 16mm 14mm 20mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #0f172a;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 13px;
            line-height: 1.55;
            background: #ffffff;
          }

          .document {
            width: 100%;
          }

          .print-footer {
            position: fixed;
            left: 0mm;
            bottom: 0mm;
            z-index: 20;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: #334155;
          }

          .header {
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 2px solid #0f172a;
          }

          .header h1 {
            margin: 0;
            font-size: 24px;
            line-height: 1.2;
          }

          .header p {
            margin: 6px 0 0;
            color: #475569;
            font-size: 12px;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }

          .question-block {
            margin-bottom: 18px;
            padding: 14px 14px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            page-break-inside: avoid;
          }

          .question-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
          }

          .question-number {
            font-weight: 700;
            font-size: 14px;
          }

          .question-tag {
            padding: 2px 8px;
            border-radius: 999px;
            background: #e2e8f0;
            color: #334155;
            font-size: 11px;
            font-family: Arial, Helvetica, sans-serif;
          }

          .passage {
            margin-bottom: 12px;
            padding: 12px;
            border-left: 4px solid #1d4ed8;
            background: #f8fafc;
          }

          .question-image-wrap {
            margin: 12px 0;
            text-align: center;
          }

          .question-image {
            max-width: 100%;
            max-height: 320px;
            border-radius: 8px;
          }

          .question-text {
            margin-bottom: 12px;
            font-size: 14px;
          }

          .choices {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .choices li {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 8px;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }

          .choice-label {
            min-width: 20px;
            font-family: Arial, Helvetica, sans-serif;
            font-weight: 700;
          }

          .choice-text {
            flex: 1;
          }

          .spr-box {
            margin-top: 8px;
            padding: 12px;
            border: 1px dashed #94a3b8;
            border-radius: 8px;
          }

          .spr-title {
            margin-bottom: 18px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .spr-line {
            height: 30px;
            border-bottom: 1px solid #0f172a;
          }

          .answer-key-page {
            position: relative;
            min-height: 260mm;
            margin-top: 22px;
            padding-top: 8px;
            page-break-before: always;
            page-break-inside: avoid;
            overflow: hidden;
          }

          .answer-watermark {
            position: absolute;
            top: 0;
            right: 0;
            display: block;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 42px;
            font-weight: 700;
            color: rgba(15, 23, 42, 0.12);
            letter-spacing: 0.08em;
            text-transform: uppercase;
            pointer-events: none;
            transform: none;
            user-select: none;
            z-index: 0;
          }

          .answer-key-header {
            position: relative;
            z-index: 2;
            margin-bottom: 18px;
            padding-top: 18px;
          }

          .answer-key-label {
            display: inline-block;
            margin-bottom: 10px;
            padding: 4px 10px;
            background: #334155;
            color: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }

          .answer-key-header h2 {
            margin: 0;
            font-size: 28px;
          }

          .answer-groups {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px 22px;
          }

          .answer-group {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .answer-group h3 {
            margin: 0 0 10px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 16px;
            font-weight: 700;
          }

          .answer-columns {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0 10px;
          }

          .answer-column {
            padding: 4px 8px 6px;
            background: rgba(148, 163, 184, 0.12);
          }

          .answer-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
            min-height: 21px;
            margin-bottom: 3px;
          }

          .answer-number {
            width: 18px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #475569;
            text-align: right;
          }

          .answer-value {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            word-break: break-word;
          }

          p, ul, ol {
            margin-top: 0;
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <main class="document">
          <header class="header">
            <h1>${escapeHtml(testTitle)}</h1>
            <p>${escapeHtml(subtitle)} • ${sortedQuestions.length} questions</p>
          </header>
          ${questionsHtml}
          ${answerKeyHtml}
        </main>
        <div class="print-footer">Ronan SAT</div>
      </body>
    </html>
  `;
}
