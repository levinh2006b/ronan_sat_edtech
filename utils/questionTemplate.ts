import katex from "katex";
import { marked } from "marked";

import { isVerbalSection, MATH_SECTION, VERBAL_SECTION } from "@/lib/sections";

type RawQuestion = {
  order?: number;
  section?: string;
  module?: number;
  questionType?: "multiple_choice" | "spr";
  questionText?: string;
  passage?: string;
  choices?: string[];
  correctAnswer?: string;
  sprAnswers?: string[];
  imageUrl?: string;
  [key: string]: unknown;
};

type GeneratePDFTemplateParams = {
  testId?: string;
  testTitle: string;
  questions: RawQuestion[];
  sectionName?: string;
  documentTitle?: string;
  assetBaseUrl?: string;
  testingRoomUrl?: string;
  testingRoomQrSvg?: string;
};

type StageDefinition = {
  key: string;
  section: string;
  sectionNumber: 1 | 2;
  module: 1 | 2;
  sectionTitle: string;
  timingMinutes: number;
  directions: string;
};

type ActiveStage = StageDefinition & {
  questions: RawQuestion[];
};

type QuestionRenderItem = {
  question: RawQuestion;
  number: number;
  showPassage: boolean;
  passageHeading?: string;
  passageReference?: string;
  estimatedUnits: number;
};

type StageQuestionPage = {
  leftColumn: QuestionRenderItem[];
  rightColumn: QuestionRenderItem[];
  showStopBanner: boolean;
};

type ColumnTarget = "left" | "right";

const SECTION_ORDER: Record<string, number> = {
  [VERBAL_SECTION]: 0,
  [MATH_SECTION]: 1,
};

const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    key: `${VERBAL_SECTION}-1`,
    section: VERBAL_SECTION,
    sectionNumber: 1,
    module: 1,
    sectionTitle: "Reading and Writing",
    timingMinutes: 39,
    directions:
      "The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s). All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.",
  },
  {
    key: `${VERBAL_SECTION}-2`,
    section: VERBAL_SECTION,
    sectionNumber: 1,
    module: 2,
    sectionTitle: "Reading and Writing",
    timingMinutes: 39,
    directions:
      "The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s). All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.",
  },
  {
    key: `${MATH_SECTION}-1`,
    section: MATH_SECTION,
    sectionNumber: 2,
    module: 1,
    sectionTitle: "Math",
    timingMinutes: 43,
    directions:
      "The questions in this section address a number of important math skills. Use of a calculator is permitted for all questions.",
  },
  {
    key: `${MATH_SECTION}-2`,
    section: MATH_SECTION,
    sectionNumber: 2,
    module: 2,
    sectionTitle: "Math",
    timingMinutes: 43,
    directions:
      "The questions in this section address a number of important math skills. Use of a calculator is permitted for all questions.",
  },
];

const STAGE_ORDER_LOOKUP = Object.fromEntries(
  STAGE_DEFINITIONS.map((stage, index) => [stage.key, index]),
);

function getTopBannerPath(stage: ActiveStage): string {
  return `/pdf-assets/banners/banner-${stage.sectionNumber}-${stage.module}.svg`;
}

function getMathReferenceAssetPath(): string {
  return "/pdf-assets/math-reference.svg";
}

const COLUMN_LIMITS: Record<string, number> = {
  [VERBAL_SECTION]: 18,
  [MATH_SECTION]: 18,
};

const TALL_MATH_PATTERN = /\\frac|\^(?:\{[^}]+\}|\S)/;

function groupConsecutiveDisplayMathBlocks(html: string): string {
  return html.replace(
    /(?:<div class="display-math-block">[\s\S]*?<\/div>\s*){2,}/g,
    (groupHtml) => `<div class="display-math-group">${groupHtml.trim()}</div>`,
  );
}

function hasTallMath(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }

  return TALL_MATH_PATTERN.test(text);
}

function loosenTallInlineMathText(mathText: string): string {
  return mathText.replace(/\\frac/g, "\\dfrac");
}

function parseText(
  text: string | null | undefined,
  options?: {
    promoteStandaloneMath?: boolean;
    loosenTallInlineMath?: boolean;
  },
): string {
  if (!text) {
    return "";
  }

  const normalizedText = options?.promoteStandaloneMath
    ? text.replace(/^\s*\$(?!\$)(.+?)\$(?!\$)\s*$/gm, (_, mathText: string) => {
        return `$$${mathText.trim()}$$`;
      })
    : text;

  const parsedMath = normalizedText.replace(
    /(\$\$?)(.*?)\1/gs,
    (match, prefix, mathText) => {
      try {
        const isDisplayMath = prefix === "$$";
        const normalizedMathText = mathText.trim();
        const renderMathText =
          !isDisplayMath && options?.loosenTallInlineMath && hasTallMath(normalizedMathText)
            ? `\\displaystyle ${loosenTallInlineMathText(normalizedMathText)}`
            : normalizedMathText;
        const renderedMath = katex.renderToString(renderMathText, {
          displayMode: isDisplayMath,
          throwOnError: false,
          output: "html",
        });

        return isDisplayMath
          ? `\n<div class="display-math-block">${renderedMath}</div>\n`
          : renderedMath;
      } catch {
        return match;
      }
    },
  );

  const parsedHtml = marked.parse(parsedMath) as string;

  if (!options?.promoteStandaloneMath) {
    return parsedHtml;
  }

  return groupConsecutiveDisplayMathBlocks(
    parsedHtml
    .replace(
      /<p>\s*(<span class="katex-display">[\s\S]*?<\/span>)\s*<\/p>/g,
      '<div class="display-math-block">$1</div>',
    )
    .replace(
      /<p>\s*(<span class="katex">[\s\S]*?<\/span>)\s*<\/p>/g,
      '<div class="display-math-block"><span class="katex-display">$1</span></div>',
    ),
  );
}

function renderInlineMath(mathText: string): string {
  return katex.renderToString(mathText, {
    displayMode: false,
    throwOnError: false,
    output: "html",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function stripWhitespace(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeChoices(question: RawQuestion): string[] {
  if (Array.isArray(question.choices) && question.choices.length > 0) {
    return question.choices.filter(
      (choice): choice is string =>
        typeof choice === "string" && choice.trim().length > 0,
    );
  }

  return Object.keys(question)
    .filter((key) => /^choice_\d+$/.test(key))
    .sort(
      (left, right) => Number(left.split("_")[1]) - Number(right.split("_")[1]),
    )
    .map((key) => question[key])
    .filter(
      (choice): choice is string =>
        typeof choice === "string" && choice.trim().length > 0,
    );
}

function resolveImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) {
    return null;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.toLowerCase() === "cần thêm ảnh") {
    return null;
  }

  if (
    /^(https?:)?\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return null;
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${encodeURI(trimmed)}`;
}

function getNormalizedSectionLabel(section: string | undefined): string {
  return isVerbalSection(section) ? VERBAL_SECTION : (section ?? "");
}

function getQuestionSortValue(question: RawQuestion): number {
  return typeof question.order === "number" ? question.order : 0;
}

function getStageKey(
  section: string | undefined,
  moduleNumber: number | undefined,
): string {
  return `${getNormalizedSectionLabel(section) || "Unknown"}-${moduleNumber ?? 1}`;
}

function sortQuestions(questions: RawQuestion[]): RawQuestion[] {
  return [...questions].sort((left, right) => {
    const leftSection =
      SECTION_ORDER[getNormalizedSectionLabel(left.section)] ?? 99;
    const rightSection =
      SECTION_ORDER[getNormalizedSectionLabel(right.section)] ?? 99;

    if (leftSection !== rightSection) {
      return leftSection - rightSection;
    }

    if ((left.module ?? 0) !== (right.module ?? 0)) {
      return (left.module ?? 0) - (right.module ?? 0);
    }

    return getQuestionSortValue(left) - getQuestionSortValue(right);
  });
}

function getFallbackStageDefinition(question: RawQuestion): StageDefinition {
  const section = getNormalizedSectionLabel(question.section) || VERBAL_SECTION;
  const moduleNumber = question.module === 2 ? 2 : 1;

  return {
    key: getStageKey(question.section, question.module),
    section,
    sectionNumber: section === MATH_SECTION ? 2 : 1,
    module: moduleNumber,
    sectionTitle: section === MATH_SECTION ? "Math" : "Reading and Writing",
    timingMinutes: section === MATH_SECTION ? 43 : 39,
    directions:
      section === MATH_SECTION
        ? "The questions in this section address a number of important math skills. Use of a calculator is permitted for all questions."
        : "The questions in this section address a number of important reading and writing skills. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).",
  };
}

function buildActiveStages(sortedQuestions: RawQuestion[]): ActiveStage[] {
  const groupedQuestions = new Map<string, RawQuestion[]>();

  for (const question of sortedQuestions) {
    const key = getStageKey(question.section, question.module);
    const existing = groupedQuestions.get(key);
    if (existing) {
      existing.push(question);
      continue;
    }

    groupedQuestions.set(key, [question]);
  }

  return [...groupedQuestions.entries()]
    .sort(([leftKey], [rightKey]) => {
      const leftOrder = STAGE_ORDER_LOOKUP[leftKey] ?? 99;
      const rightOrder = STAGE_ORDER_LOOKUP[rightKey] ?? 99;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return leftKey.localeCompare(rightKey);
    })
    .map(([key, stageQuestions]) => {
      const knownStage = STAGE_DEFINITIONS.find((stage) => stage.key === key);
      const base = knownStage ?? getFallbackStageDefinition(stageQuestions[0]);

      return {
        ...base,
        questions: stageQuestions,
      };
    });
}

function estimateTextUnits(
  text: string | undefined,
  charactersPerUnit: number,
  minimumUnits = 0,
): number {
  const normalized = stripWhitespace(text);
  if (!normalized) {
    return minimumUnits;
  }

  return Math.max(
    minimumUnits,
    Math.ceil(normalized.length / charactersPerUnit),
  );
}

function buildQuestionRenderItems(
  questions: RawQuestion[],
  section: string,
): QuestionRenderItem[] {
  const items: QuestionRenderItem[] = questions.map((question, index) => ({
    question,
    number: index + 1,
    showPassage: false,
    estimatedUnits: 0,
  }));

  let index = 0;
  while (index < items.length) {
    const currentPassage = stripWhitespace(items[index].question.passage);
    if (!currentPassage) {
      index += 1;
      continue;
    }

    let endIndex = index;
    while (
      endIndex + 1 < items.length &&
      stripWhitespace(items[endIndex + 1].question.passage) === currentPassage
    ) {
      endIndex += 1;
    }

    items[index].showPassage = true;
    items[index].passageHeading = undefined;

    for (let cursor = index + 1; cursor <= endIndex; cursor += 1) {
      items[cursor].passageReference =
        `Refer to the passage for Question${index === endIndex ? "" : "s"} ${items[index].number}${index === endIndex ? "" : `-${items[endIndex].number}`}.`;
    }

    index = endIndex + 1;
  }

  return items.map((item) => ({
    ...item,
    estimatedUnits: estimateQuestionUnits(item, section),
  }));
}

function estimateQuestionUnits(
  item: QuestionRenderItem,
  section: string,
): number {
  const choices = normalizeChoices(item.question);
  const hasImage = Boolean(resolveImageUrl(item.question.imageUrl));
  const baseUnits = section === MATH_SECTION ? 7 : 8;

  let units = baseUnits;
  units += estimateTextUnits(
    item.question.questionText,
    section === MATH_SECTION ? 170 : 150,
    2,
  );
  units += item.showPassage
    ? estimateTextUnits(item.question.passage, 240, 6)
    : 0;
  units += item.passageReference ? 1 : 0;
  units +=
    item.question.questionType === "spr"
      ? 3
      : Math.max(3, Math.ceil(choices.join(" ").length / 120));
  units += hasImage ? 8 : 0;

  return units;
}

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function getChoiceIndexFromCode(value?: string | null): number {
  const match = value?.match(/^choice_(\d+)$/i);
  return match ? Number(match[1]) : -1;
}

function getAnswerKeyValue(question: RawQuestion): string {
  if (question.questionType === "spr") {
    const answers = Array.isArray(question.sprAnswers)
      ? question.sprAnswers.filter(
          (answer): answer is string =>
            typeof answer === "string" && answer.trim().length > 0,
        )
      : [];

    return answers.join(", ") || "-";
  }

  const choices = normalizeChoices(question);
  const correctAnswer = question.correctAnswer?.trim() ?? "";
  const choiceIndex = getChoiceIndexFromCode(correctAnswer);

  if (choiceIndex >= 0) {
    return String.fromCharCode(65 + choiceIndex);
  }

  const matchingChoiceIndex = choices.findIndex(
    (choice) => normalizeText(choice) === normalizeText(correctAnswer),
  );

  if (matchingChoiceIndex >= 0) {
    return String.fromCharCode(65 + matchingChoiceIndex);
  }

  return correctAnswer || "-";
}

function buildAnswerKeySection(stage: ActiveStage): string {
  const entries = stage.questions
    .map(
      (question, index) => `
        <div class="answer-key-entry">
          <span class="answer-key-number">${index + 1}</span>
          <span class="answer-key-value">${escapeHtml(getAnswerKeyValue(question))}</span>
        </div>
      `,
    )
    .join("");

  return `
    <section class="answer-key-section">
      <h2 class="answer-key-section-title">${escapeHtml(`${stage.sectionTitle} Module ${stage.module}`)}</h2>
      <div class="answer-key-entry-grid">${entries}</div>
    </section>
  `;
}

function buildAnswerKeyPage(testTitle: string, stages: ActiveStage[]): string {
  const sectionHtml = stages
    .map((stage) => buildAnswerKeySection(stage))
    .join("");

  return `
    <section class="sat-page answer-key-page">
      <div class="answer-key-watermark">RONAN SAT</div>
      <div class="answer-key-header">
        <div class="answer-key-test-title">${escapeHtml(testTitle)}</div>
        <div class="answer-key-label">Answer Key</div>
      </div>
      <div class="answer-key-grid">${sectionHtml}</div>
      <div class="answer-key-footer">
        <div>${escapeHtml(testTitle)}</div>
        <div>Visit learn.ronansat.com for the digital testing room.</div>
      </div>
    </section>
  `;
}

function buildQuestionPages(stage: ActiveStage): StageQuestionPage[] {
  const items = buildQuestionRenderItems(stage.questions, stage.section);
  const limit = COLUMN_LIMITS[stage.section] ?? 18;
  const pages: StageQuestionPage[] = [];

  let currentPage: StageQuestionPage = {
    leftColumn: [],
    rightColumn: [],
    showStopBanner: false,
  };
  let leftUnits = 0;
  let rightUnits = 0;
  let target: ColumnTarget = "left";

  const pushPage = () => {
    if (
      currentPage.leftColumn.length === 0 &&
      currentPage.rightColumn.length === 0
    ) {
      return;
    }

    pages.push(currentPage);
    currentPage = { leftColumn: [], rightColumn: [], showStopBanner: false };
    leftUnits = 0;
    rightUnits = 0;
    target = "left";
  };

  for (const item of items) {
    if (target === "left") {
      if (
        leftUnits + item.estimatedUnits <= limit ||
        currentPage.leftColumn.length === 0
      ) {
        currentPage.leftColumn.push(item);
        leftUnits += item.estimatedUnits;
        continue;
      }

      target = "right";
    }

    if (
      rightUnits + item.estimatedUnits <= limit ||
      currentPage.rightColumn.length === 0
    ) {
      currentPage.rightColumn.push(item);
      rightUnits += item.estimatedUnits;
      continue;
    }

    pushPage();
    currentPage.leftColumn.push(item);
    leftUnits += item.estimatedUnits;
  }

  pushPage();

  if (pages.length === 0) {
    pages.push({ leftColumn: [], rightColumn: [], showStopBanner: true });
  }

  pages[pages.length - 1].showStopBanner = true;

  return pages;
}

function buildTopBand(stage: ActiveStage): string {
  const bannerSrc = getTopBannerPath(stage);

  return `
    <div class="top-band">
      <img src="${bannerSrc}" alt="" aria-hidden="true" class="top-band-image" />
    </div>
  `;
}

function buildPageFooter(pageNumber: number, continueLabel?: string): string {
  const actionHtml = continueLabel
    ? `
        <div class="page-action">
          <span class="page-action-label">${escapeHtml(continueLabel)}</span>
          <span class="page-action-arrow"></span>
        </div>
      `
    : "<div></div>";

  return `
    <div class="page-footer">
      <div class="page-legal">PDF version from learn.ronansat.com. Happy practicing!</div>
      <div class="page-number">${pageNumber}</div>
      ${actionHtml}
    </div>
  `;
}

function buildQuestionCard(item: QuestionRenderItem): string {
  const imageUrl = resolveImageUrl(item.question.imageUrl);
  const choices = normalizeChoices(item.question);
  const labels = ["A", "B", "C", "D", "E", "F"];
  const passageHasTallMath = hasTallMath(item.question.passage);
  const promptHasTallMath = hasTallMath(item.question.questionText);
  const choicesHaveTallMath = choices.some((choice) => hasTallMath(choice));

  const passageHtml = item.showPassage
    ? `
        <div class="passage-body${passageHasTallMath ? " passage-body--tall-math" : ""}">${parseText(item.question.passage, { promoteStandaloneMath: true, loosenTallInlineMath: true })}</div>
      `
    : item.passageReference
      ? `<div class="passage-reference">${escapeHtml(item.passageReference)}</div>`
      : "";

  const imageHtml = imageUrl
    ? `
        <div class="question-image-wrap">
          <img src="${escapeAttribute(imageUrl)}" alt="Question illustration" class="question-image" />
        </div>
      `
    : "";

  const promptHtml = item.question.questionText
    ? `<div class="question-text${promptHasTallMath ? " question-text--tall-math" : ""}">${parseText(item.question.questionText, { promoteStandaloneMath: true, loosenTallInlineMath: true })}</div>`
    : "";
  const answerHtml =
    item.question.questionType === "spr"
      ? `<div class="spr-answer-line"></div>`
      : `
          <ol class="answer-choice-list${choicesHaveTallMath ? " answer-choice-list--tall-math" : ""}">
            ${choices
              .map(
                (choice, index) => `
                  <li>
                    <span class="answer-choice-label">${labels[index]})</span>
                    <div class="answer-choice-text${choicesHaveTallMath ? " answer-choice-text--tall-math" : ""}">${parseText(choice, { loosenTallInlineMath: true })}</div>
                  </li>
                `,
              )
              .join("")}
          </ol>
        `;

  return `
    <article class="question-card">
      <div class="question-bar"><span><span class="question-bar-number-text">${item.number}</span></span></div>
      <div class="question-card-body">
        ${passageHtml}
        ${imageHtml}
        ${promptHtml}
        ${answerHtml}
      </div>
    </article>
  `;
}

function buildQuestionColumn(items: QuestionRenderItem[]): string {
  return items.length > 0
    ? items.map((item) => buildQuestionCard(item)).join("")
    : "<div></div>";
}

function buildStopBanner(): string {
  return `
    <div class="stop-banner">
      <div class="stop-banner-title">STOP</div>
      <div class="stop-banner-copy">If you finish before time is called, you may check your work on this module only.</div>
      <div class="stop-banner-copy">Do not turn to any other module in the test.</div>
    </div>
  `;
}

function buildQuestionColumns(
  page: StageQuestionPage,
  className?: string,
): string {
  const questionColumnsClassName = [
    "question-columns",
    page.showStopBanner ? "question-columns-with-stop" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="${questionColumnsClassName}">
      <div class="question-column">${buildQuestionColumn(page.leftColumn)}</div>
      <div class="question-column-divider"></div>
      <div class="question-column">${buildQuestionColumn(page.rightColumn)}</div>
    </div>
    ${page.showStopBanner ? buildStopBanner() : ""}
  `;
}

function buildQuestionPage(
  stage: ActiveStage,
  page: StageQuestionPage,
  pageNumber: number,
): string {
  return `
    <section class="sat-page content-page">
      ${buildTopBand(stage)}
      <div class="page-inner question-page-inner">
        ${buildQuestionColumns(page)}
      </div>
      ${buildPageFooter(pageNumber, page.showStopBanner ? undefined : "CONTINUE")}
    </section>
  `;
}

function buildVerbalIntroPage(
  stage: ActiveStage,
  pageNumber: number,
  embeddedQuestionPage?: StageQuestionPage,
): string {
  const introClassName = embeddedQuestionPage
    ? "sat-page intro-page verbal-intro-page verbal-intro-page-with-questions"
    : "sat-page intro-page verbal-intro-page";

  return `
    <section class="${introClassName}">
      ${buildTopBand(stage)}
      <div class="page-inner intro-page-inner">
        <div class="section-title-wrap">
          <h1>${escapeHtml(stage.sectionTitle)}</h1>
          <div class="section-title-meta">${stage.questions.length} QUESTIONS</div>
        </div>
        <div class="section-rule"></div>
        <div class="directions-card">
          <div class="directions-tag">DIRECTIONS</div>
          <p>${escapeHtml(stage.directions)}</p>
        </div>
        <div class="section-rule section-rule-bottom"></div>
        ${
          embeddedQuestionPage
            ? `<div class="verbal-intro-question-block">${buildQuestionColumns(embeddedQuestionPage, "embedded-question-columns")}</div>`
            : ""
        }
      </div>
      ${buildPageFooter(pageNumber, embeddedQuestionPage?.showStopBanner ? undefined : "CONTINUE")}
    </section>
  `;
}

function buildMathReferenceFigure(): string {
  return `
    <img src="${getMathReferenceAssetPath()}" alt="Math reference figures and formulas" class="math-reference-svg" />
  `;
}

function buildMathIntroPage(stage: ActiveStage, pageNumber: number): string {
  return `
    <section class="sat-page intro-page math-intro-page">
      ${buildTopBand(stage)}
      <div class="page-inner intro-page-inner math-intro-inner">
        <div class="section-title-wrap">
          <h1>${escapeHtml(stage.sectionTitle)}</h1>
          <div class="section-title-meta">${stage.questions.length} QUESTIONS</div>
        </div>
        <div class="section-rule"></div>
        <div class="directions-card math-directions-card">
          <div class="directions-tag">DIRECTIONS</div>
          <p>${escapeHtml(stage.directions)}</p>
          <div class="directions-tag secondary-tag">NOTES</div>
          <div class="math-notes-copy">Unless otherwise indicated:</div>
          <ul class="math-note-list">
            <li>All variables and expressions represent real numbers.</li>
            <li>Figures provided are drawn to scale.</li>
            <li>All figures lie in a plane.</li>
            <li>The domain of a given function ${renderInlineMath("f")} is the set of all real numbers ${renderInlineMath("x")} for which ${renderInlineMath("f(x)")} is a real number.</li>
          </ul>
          <div class="directions-tag secondary-tag">REFERENCE</div>
          ${buildMathReferenceFigure()}
          <div class="math-reference-copy">The number of degrees of arc in a circle is ${renderInlineMath("360")}.</div>
          <div class="math-reference-copy">The number of radians of arc in a circle is ${renderInlineMath("2\\pi")}.</div>
          <div class="math-reference-copy">The sum of the measures in degrees of the angles of a triangle is ${renderInlineMath("180")}.</div>
        </div>
        <div class="section-rule section-rule-bottom"></div>
      </div>
      ${buildPageFooter(pageNumber, "CONTINUE")}
    </section>
  `;
}

function buildMathResponseInstructionsPage(
  stage: ActiveStage,
  pageNumber: number,
): string {
  return `
    <section class="sat-page content-page math-response-page">
      ${buildTopBand(stage)}
      <div class="page-inner math-response-inner">
        <div class="math-response-copy">
          <p><strong>For multiple-choice questions</strong>, solve each problem, choose the correct answer from the choices provided, and then circle your answer in this book. Circle only one answer for each question. If you change your mind, completely erase the circle. You will not get credit for questions with more than one answer circled, or for questions with no answers circled.</p>
          <p><strong>For student-produced response questions</strong>, solve each problem and write your answer next to or under the question in the test book as described below.</p>
          <ul>
            <li>Once you’ve written your answer, circle it clearly. You will not receive credit for anything written outside the circle, or for any questions with more than one circled answer.</li>
            <li>If you find <strong>more than one</strong> correct answer, write and circle only one answer.</li>
            <li>Your answer can be up to 5 characters for a <strong>positive</strong> answer and up to 6 characters (including the negative sign) for a <strong>negative</strong> answer, but no more.</li>
            <li>If your answer is a <strong>fraction</strong> that is too long, write the decimal equivalent.</li>
            <li>If your answer is a <strong>decimal</strong> that is too long, truncate it or round at the fourth digit.</li>
            <li>If your answer is a <strong>mixed number</strong> (such as 3 1/2), write it as an improper fraction (7/2) or its decimal equivalent (3.5).</li>
            <li>Don’t include <strong>symbols</strong> such as a percent sign, comma, or dollar sign in your circled answer.</li>
          </ul>
        </div>
      </div>
      ${buildPageFooter(pageNumber, "CONTINUE")}
    </section>
  `;
}

function buildCoverCode(testTitle: string): string {
  const normalized = stripWhitespace(testTitle)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const prefix = normalized.slice(0, 2) || "WX";
  const digits = String(normalized.length).padStart(4, "0");
  return `${prefix}${digits}P0010`;
}

const CODE39_PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

function buildCode39BarcodeSvg(value: string): string {
  const encodedValue = `*${value.toUpperCase()}*`;
  const narrowWidth = 2;
  const wideWidth = 5;
  const barHeight = 62;
  const quietZone = 12;
  const interCharacterGap = narrowWidth;

  let x = quietZone;
  const bars: string[] = [];

  for (let index = 0; index < encodedValue.length; index += 1) {
    const pattern = CODE39_PATTERNS[encodedValue[index]];

    if (!pattern) {
      continue;
    }

    for (
      let patternIndex = 0;
      patternIndex < pattern.length;
      patternIndex += 1
    ) {
      const unit = pattern[patternIndex] === "w" ? wideWidth : narrowWidth;
      const isBar = patternIndex % 2 === 0;

      if (isBar) {
        bars.push(
          `<rect x="${x}" y="0" width="${unit}" height="${barHeight}" fill="#111111" />`,
        );
      }

      x += unit;
    }

    if (index < encodedValue.length - 1) {
      x += interCharacterGap;
    }
  }

  const totalWidth = x + quietZone;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${barHeight}" preserveAspectRatio="none" aria-hidden="true">
      <rect width="${totalWidth}" height="${barHeight}" fill="#ffffff" />
      ${bars.join("")}
    </svg>
  `;
}

function formatCoverCodeLabel(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (/^[A-F0-9]{24}$/.test(normalized)) {
    return `${normalized.slice(0, 6)}-${normalized.slice(6, 12)}-${normalized.slice(12, 18)}-${normalized.slice(18)}`;
  }

  return normalized;
}

function buildCoverPage(
  testTitle: string,
  sectionName?: string,
  testId?: string,
  testingRoomUrl?: string,
  testingRoomQrSvg?: string,
): string {
  const coverCode = (testId || "").trim() || buildCoverCode(testTitle);
  const barcodeSvg = buildCode39BarcodeSvg(coverCode);
  const coverCodeLabel = formatCoverCodeLabel(coverCode);
  const subtitleHtml = sectionName
    ? `<div class="cover-subtitle">${escapeHtml(sectionName)} booklet</div>`
    : "";
  const qrCalloutHtml =
    testingRoomUrl && testingRoomQrSvg
      ? `
        <div class="cover-callout cover-callout--qr">
          <div>
            <div class="cover-callout-heading">Access the digital version</div>
            <div class="cover-callout-copy cover-callout-copy--compact">Scan this code to access the digital version instead of using the paper booklet.</div>
          </div>
          <div class="cover-qr-block">
            <div class="cover-qr-frame">
              <div class="cover-qr-art">${testingRoomQrSvg}</div>
              <div class="cover-qr-logo-wrap">
                <img src="/brand/logo.svg" alt="Ronan SAT logo" class="cover-qr-logo" />
              </div>
            </div>
          </div>
        </div>
      `
      : "";

  return `
    <section class="sat-page cover-page">
      <div class="cover-right-stripe"></div>
      <div class="cover-barcode-wrap">
        <div class="cover-barcode">${barcodeSvg}</div>
        <div class="cover-barcode-text">${escapeHtml(coverCodeLabel)}</div>
      </div>

      <div class="cover-main">
        <div class="cover-brand-title">Ronan SAT</div>
        <div class="cover-brand-rule"></div>
        <div class="cover-practice-title">${escapeHtml(testTitle)}</div>
        ${subtitleHtml}
        ${qrCalloutHtml}
      </div>

      <div class="cover-lockup-row">
        <div class="cover-lockup-mark">
          <div class="cover-lockup-icon"><img src="/brand/logo.svg" alt="Ronan SAT logo" class="cover-lockup-logo" /></div>
          <div class="cover-lockup-wordmark">RONAN SAT</div>
        </div>
      </div>
    </section>
  `;
}

function buildPreludePage(): string {
  return `
    <section class="sat-page prelude-page">
      <div class="prelude-message">Test begins on the next page.</div>
    </section>
  `;
}

function buildNoMaterialPage(): string {
  return `
    <section class="sat-page no-material-page">
      <div class="no-material-copy">No Test Material On This Page</div>
    </section>
  `;
}

function buildStyles(): string {
  return `
    @page {
      size: Letter;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    body {
      color: #111111;
      font-family: "Minion Pro", "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @font-face {
      font-family: "Minion Pro";
      src: url("__ASSET_BASE__/pdf-assets/fonts/MinionPro-Regular.otf") format("opentype");
      font-style: normal;
      font-weight: 400;
    }

    @font-face {
      font-family: "Minion Pro";
      src: url("__ASSET_BASE__/pdf-assets/fonts/MinionPro-It.otf") format("opentype");
      font-style: italic;
      font-weight: 400;
    }

    @font-face {
      font-family: "Minion Pro";
      src: url("__ASSET_BASE__/pdf-assets/fonts/MinionPro-Bold.otf") format("opentype");
      font-style: normal;
      font-weight: 700;
    }

    @font-face {
      font-family: "Minion Pro";
      src: url("__ASSET_BASE__/pdf-assets/fonts/MinionPro-BoldIt.otf") format("opentype");
      font-style: italic;
      font-weight: 700;
    }

    p,
    ul,
    ol {
      margin-top: 0;
      margin-bottom: 0;
    }

    .sat-booklet {
      width: 100%;
    }

    .sat-page {
      position: relative;
      width: 8.5in;
      height: 11in;
      overflow: hidden;
      background: #ffffff;
      page-break-after: always;
      break-after: page;
    }

    .sat-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .page-inner {
      padding: 0 0.52in 0.78in;
    }

    .top-band {
      width: auto;
      margin: 0.18in 0.52in 0.55in;
    }

    .top-band-image {
      display: block;
      width: 100%;
      height: auto;
    }

    .page-footer {
      position: absolute;
      left: 0.55in;
      right: 0.55in;
      bottom: 0.28in;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      align-items: end;
      gap: 0.18in;
      font-family: Arial, Helvetica, sans-serif;
    }

    .page-legal {
      font-size: 8px;
      line-height: 1.25;
    }

    .page-number {
      font-size: 0.18in;
      font-weight: 700;
      line-height: 1;
      justify-self: center;
    }

    .page-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      justify-self: end;
      min-width: 1.34in;
      height: 0.28in;
      padding: 0 0.22in 0 0.12in;
      background: #111111;
      color: #ffffff;
      line-height: 1;
      clip-path: polygon(0 0, calc(100% - 0.18in) 0, 100% 50%, calc(100% - 0.18in) 100%, 0 100%);
    }

    .page-action-label {
      padding: 0;
      font-size: 0.11in;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .page-action-arrow {
      display: none;
    }

    .cover-page {
      padding: 0.4in 0.3in 0.28in;
    }

    .cover-main {
      position: absolute;
      left: 0.3in;
      right: 0.78in;
      top: 50%;
      transform: translateY(-50%);
    }

    .cover-right-stripe {
      position: absolute;
      top: 0;
      right: 0;
      width: 0.45in;
      height: 100%;
      background: repeating-linear-gradient(135deg, #d3eef8 0, #d3eef8 2px, #ffffff 2px, #ffffff 6px);
    }

    .cover-barcode-wrap {
      position: absolute;
      top: 0.36in;
      right: 0.78in;
      width: 2.25in;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
    }

    .cover-barcode {
      width: 100%;
      height: 0.42in;
    }

    .cover-barcode svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .cover-barcode-text {
      margin-top: 0.04in;
      font-size: 0.1in;
      letter-spacing: 0.01em;
    }

    .cover-brand-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.68in;
      font-weight: 800;
      line-height: 0.95;
      letter-spacing: -0.02em;
    }

    .cover-registered {
      font-size: 0.26em;
      vertical-align: super;
    }

    .cover-brand-rule {
      width: 3.76in;
      height: 0.12in;
      margin-top: 0.08in;
      background: #0e77a6;
    }

    .cover-practice-title {
      margin-top: 0.14in;
      font-size: 0.68in;
      line-height: 0.93;
      letter-spacing: -0.03em;
      white-space: nowrap;
      text-align: left;
    }

    .cover-subtitle {
      margin-top: 0.05in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.14in;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #0e77a6;
    }

    .cover-callout {
      width: 6.4in;
      margin-top: 0.92in;
      padding: 0.24in 0.28in 0.22in;
      border: 1.5px solid #0e77a6;
      border-top-width: 4px;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
    }

    .cover-callout-heading {
      font-size: 0.28in;
      font-weight: 700;
      line-height: 1.15;
    }

    .cover-callout-copy {
      margin-top: 0.05in;
      font-size: 0.25in;
      line-height: 1.18;
    }

    .cover-callout-copy--compact {
      font-size: 0.19in;
      line-height: 1.24;
    }

    .cover-callout-copy-secondary {
      margin-top: 0.18in;
      font-size: 0.18in;
      line-height: 1.2;
    }

    .cover-callout--qr {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1.82in;
      align-items: center;
      gap: 0.22in;
      width: 6.35in;
      margin-top: 0.42in;
      padding: 0.18in 0.22in;
    }

    .cover-qr-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.08in;
    }

    .cover-qr-frame {
      position: relative;
      width: 1.5in;
      height: 1.5in;
      border: 1.5px solid #111111;
      background: #ffffff;
      padding: 0.08in;
    }

    .cover-qr-art,
    .cover-qr-art svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .cover-qr-logo-wrap {
      position: absolute;
      left: 50%;
      top: 50%;
      display: flex;
      width: 0.38in;
      height: 0.38in;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      border: 1px solid #111111;
      border-radius: 999px;
      background: #ffffff;
      padding: 0.05in;
    }

    .cover-qr-logo {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .cover-lockup-row {
      position: absolute;
      left: 0.3in;
      right: 0.78in;
      bottom: 0.34in;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: Arial, Helvetica, sans-serif;
    }

    .cover-lockup-mark {
      display: inline-flex;
      border: 1px solid #111111;
    }

    .cover-lockup-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 0.66in;
      padding: 0.08in 0.06in;
      background: #111111;
    }

    .cover-lockup-wordmark {
      display: flex;
      align-items: center;
      padding: 0.08in 0.12in;
      font-size: 0.16in;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.02em;
    }

    .cover-lockup-logo {
      display: block;
      width: 0.28in;
      height: 0.28in;
      object-fit: contain;
    }

    .cover-lockup-version {
      font-size: 0.14in;
    }

    .prelude-page {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .prelude-message {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.26in;
      font-weight: 700;
    }

    .intro-page-inner {
      padding-top: 0.02in;
    }

    .verbal-intro-page-with-questions .intro-page-inner {
      padding-bottom: 0.56in;
    }

    .section-title-wrap {
      margin-left: 1.02in;
    }

    .section-title-wrap h1 {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.36in;
      font-weight: 700;
      line-height: 1.02;
    }

    .section-title-meta {
      margin-top: 0.05in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.165in;
      font-weight: 700;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }

    .section-rule {
      height: 1px;
      margin: 0.22in 0 0.18in;
      background: #b9b9b9;
    }

    .section-rule-bottom {
      margin-top: 0.22in;
    }

    .directions-card {
      width: 5.94in;
      margin-left: 1.02in;
      font-family: Arial, Helvetica, sans-serif;
    }

    .directions-tag,
    .question-bar span,
    .secondary-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #111111;
      color: #ffffff;
      font-size: 0.11in;
      font-weight: 700;
      letter-spacing: 0.1em;
      line-height: 1;
      text-transform: uppercase;
    }

    .directions-tag {
      padding: 0.05in 0.08in;
    }

    .directions-card p {
      margin-top: 0.12in;
      font-size: 0.138in;
      line-height: 1.32;
    }

    .math-directions-card {
      width: 5.98in;
    }

    .secondary-tag {
      margin-top: 0.12in;
      padding: 0.04in 0.07in;
    }

    .math-notes-copy,
    .math-reference-copy {
      margin-top: 0.1in;
      font-size: 0.132in;
      line-height: 1.28;
    }

    .math-note-list {
      margin: 0.08in 0 0;
      padding-left: 0.16in;
      font-size: 0.132in;
      line-height: 1.28;
    }

    .math-note-list li {
      margin-bottom: 0.06in;
    }

    .math-reference-svg {
      display: block;
      width: 100%;
      max-width: 5.98in;
      height: auto;
      margin: 0.12in auto 0;
    }

    .math-response-inner {
      padding-top: 0.28in;
    }

    .math-response-copy {
      width: 5.82in;
      margin-left: 1.16in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.136in;
      line-height: 1.3;
    }

    .math-response-copy p {
      margin-bottom: 0.12in;
    }

    .math-response-copy ul {
      padding-left: 0.18in;
    }

    .math-response-copy li {
      margin-bottom: 0.07in;
    }

    .question-page-inner {
      padding-top: 0;
    }

    .verbal-intro-question-block {
      margin-top: 0.35in;
    }

    .verbal-intro-question-block .question-card {
      margin-bottom: 0;
    }

    .question-columns {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
      gap: 0.22in;
      min-height: 8.38in;
    }

    .question-columns-with-stop {
      min-height: 6.98in;
    }

    .question-columns.embedded-question-columns {
      min-height: auto;
    }

    .question-column-divider {
      background: repeating-linear-gradient(to bottom, #c7c7c7 0, #c7c7c7 3px, transparent 3px, transparent 6px);
    }

    .question-column {
      min-width: 0;
    }

    .question-card {
      margin-bottom: 0.18in;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .question-bar {
      position: relative;
      height: 0.2in;
      background: #d9d9dd;
    }

    .question-bar > span {
      position: absolute;
      left: 0;
      top: 50%;
      display: grid;
      place-items: center;
      min-width: 0.3in;
      height: 0.2in;
      padding: 0;
      background: #111111;
      color: #ffffff;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0;
      transform: translateY(calc(-50%));
    }

    .question-bar > span > .question-bar-number-text {
      display: inline-block;
      position: relative;
      top: 0.003in;
      font-family: "Times New Roman", Times, serif;
      font-size: 0.15in;
      font-weight: 500;
      letter-spacing: -0.015em;
      color: #ffffff;
      line-height: 1;
    }

    .question-card-body {
      padding-top: 0.08in;
      font-size: 0.132in;
      line-height: 1.52;
    }

    .question-card-body p {
      margin-bottom: 0.14in;
    }

    .question-card-body p:last-child {
      margin-bottom: 0;
    }

    .display-math-block {
      display: flex;
      justify-content: center;
      width: 100%;
      margin: 0.1in 0 0.14in;
      padding: 0.02in 0;
    }

    .display-math-block:last-child {
      margin-bottom: 0.04in;
    }

    .display-math-group {
      display: flex;
      flex-direction: column;
      gap: 0.035in;
      width: 100%;
      margin: 0.1in 0 0.14in;
    }

    .display-math-group:last-child {
      margin-bottom: 0.04in;
    }

    .display-math-group > .display-math-block {
      margin: 0;
      padding: 0.02in 0;
    }

    .display-math-block > .katex-display {
      margin: 0;
      text-align: center;
    }

    .display-math-block > .katex-display > .katex {
      display: inline-block;
      text-align: left;
    }

    .passage-kicker,
    .passage-reference {
      margin-bottom: 0.08in;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.098in;
      font-weight: 700;
      line-height: 1.35;
    }

    .passage-reference {
      color: #555555;
    }

    .passage-body {
      margin-bottom: 0.14in;
    }

    .passage-body--tall-math {
      line-height: 2.25;
    }

    .question-text {
      margin-bottom: 0.14in;
    }

    .question-text--tall-math {
      line-height: 2.25;
    }

    .question-image-wrap {
      margin: 0.06in 0 0.12in;
      text-align: center;
    }

    .question-image {
      max-width: 100%;
      max-height: 2.8in;
      object-fit: contain;
    }

    .answer-choice-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .answer-choice-list li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.08in;
      align-items: start;
      margin-bottom: 0.07in;
    }

    .answer-choice-list--tall-math li {
      margin-bottom: 0.19in;
    }

    .answer-choice-label {
      min-width: 0.22in;
    }

    .answer-choice-text--tall-math {
      line-height: 2.05;
    }

    .spr-answer-line {
      height: 0.34in;
      border-bottom: 1px solid #111111;
      margin-top: 0.1in;
    }

    .question-card table {
      width: 100%;
      margin: 0.08in 0 0.12in;
      border-collapse: collapse;
      font-size: 0.124in;
    }

    .question-card th,
    .question-card td {
      border: 1px solid #777777;
      padding: 0.04in 0.05in;
      vertical-align: top;
    }

    .question-card th {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
    }

    .question-card img {
      max-width: 100%;
      height: auto;
    }

    .question-card blockquote {
      margin: 0.08in 0 0.1in 0.16in;
      padding: 0;
      border: 0;
    }

    .question-card ul,
    .question-card ol {
      padding-left: 0.18in;
    }

    .question-card em {
      font-style: italic;
    }

    .question-card strong {
      font-weight: 700;
    }

    .stop-banner {
      margin-top: 0.24in;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
    }

    .stop-banner-title {
      font-size: 0.34in;
      font-weight: 800;
      line-height: 1;
    }

    .stop-banner-copy {
      margin-top: 0.09in;
      font-size: 0.16in;
      font-weight: 700;
      line-height: 1.25;
    }

    .no-material-page {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .no-material-copy {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.28in;
      font-weight: 700;
    }

    .answer-key-page {
      padding: 0.48in 0.55in 0.42in;
      font-family: Arial, Helvetica, sans-serif;
    }

    .answer-key-watermark {
      position: absolute;
      left: 50%;
      top: 52%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 1.1in;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: rgba(17, 17, 17, 0.06);
      white-space: nowrap;
      pointer-events: none;
    }

    .answer-key-header {
      position: relative;
      z-index: 1;
    }

    .answer-key-test-title {
      font-family: "Times New Roman", Times, serif;
      font-size: 0.42in;
      line-height: 1.08;
      color: #4c4c4c;
    }

    .answer-key-label {
      display: inline-block;
      margin-top: 0.18in;
      padding: 0.06in 0.14in;
      background: #4d4d4d;
      color: #ffffff;
      font-size: 0.18in;
      font-weight: 800;
      line-height: 1;
      text-transform: uppercase;
    }

    .answer-key-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.38in 0.42in;
      margin-top: 0.26in;
    }

    .answer-key-section {
      min-width: 0;
    }

    .answer-key-section-title {
      margin: 0 0 0.12in;
      font-size: 0.21in;
      font-weight: 700;
      line-height: 1.15;
      color: #424242;
    }

    .answer-key-entry-grid {
      column-count: 2;
      column-gap: 0.14in;
    }

    .answer-key-entry {
      display: grid;
      grid-template-columns: 0.3in minmax(0, 1fr);
      gap: 0.06in;
      align-items: baseline;
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 0.055in;
      padding: 0.015in 0.05in;
      font-size: 0.16in;
      line-height: 1.18;
    }

    .answer-key-entry:nth-child(odd) {
      background: rgba(17, 17, 17, 0.08);
    }

    .answer-key-number {
      text-align: right;
      color: #555555;
    }

    .answer-key-value {
      font-weight: 400;
      color: #333333;
      word-break: break-word;
    }

    .answer-key-footer {
      position: absolute;
      left: 0.55in;
      right: 0.55in;
      bottom: 0.22in;
      display: flex;
      justify-content: space-between;
      gap: 0.2in;
      font-family: "Times New Roman", Times, serif;
      font-size: 0.12in;
      line-height: 1.2;
      color: #5a5a5a;
    }

    math {
      font-size: 1em;
    }

    .katex {
      font-size: 1em;
      line-height: 1.04;
      text-indent: 0;
    }

    .katex .mathnormal,
    .katex .textit {
      font-family: KaTeX_Math, "Minion Pro", serif;
    }

    .katex .textrm,
    .katex .textsf,
    .katex .texttt,
    .katex .mord.text {
      font-family: "Minion Pro", "Times New Roman", Times, serif;
    }

    .katex-display {
      display: block;
      margin: 0;
      text-align: center;
    }

    .katex-display > .katex {
      display: inline-block;
      text-align: left;
    }

    .katex .base {
      white-space: nowrap;
    }

    .question-text .katex,
    .passage-body .katex,
    .answer-choice-text .katex {
      vertical-align: baseline;
    }

    .question-text--tall-math .katex,
    .passage-body--tall-math .katex,
    .answer-choice-text--tall-math .katex {
      line-height: 1.95;
    }

    .question-text--tall-math .katex .base,
    .passage-body--tall-math .katex .base,
    .answer-choice-text--tall-math .katex .base {
      padding-top: 0.26em;
      padding-bottom: 0.36em;
    }

    .question-text .katex .mord,
    .passage-body .katex .mord,
    .answer-choice-text .katex .mord,
    .question-text .katex .mopen,
    .question-text .katex .mclose,
    .passage-body .katex .mopen,
    .passage-body .katex .mclose,
    .answer-choice-text .katex .mopen,
    .answer-choice-text .katex .mclose {
      font-weight: inherit;
    }
  `;
}

export async function generatePDFTemplate({
  testId,
  testTitle,
  questions,
  sectionName,
  documentTitle,
  assetBaseUrl,
  testingRoomUrl,
  testingRoomQrSvg,
}: GeneratePDFTemplateParams): Promise<string> {
  const sortedQuestions = sortQuestions(questions);
  const stages = buildActiveStages(sortedQuestions);
  const pages: string[] = [];
  const normalizedAssetBaseUrl = (assetBaseUrl || "").replace(/\/$/, "");

  pages.push(buildCoverPage(testTitle, sectionName, testId, testingRoomUrl, testingRoomQrSvg));
  pages.push(buildPreludePage());

  let pageNumber = 2;

  stages.forEach((stage, index) => {
    const questionPages = buildQuestionPages(stage);

    if (stage.section === MATH_SECTION) {
      pages.push(buildMathIntroPage(stage, pageNumber));
      pageNumber += 1;
      pages.push(buildMathResponseInstructionsPage(stage, pageNumber));
      pageNumber += 1;
    } else {
      const [embeddedQuestionPage, ...remainingQuestionPages] = questionPages;

      pages.push(buildVerbalIntroPage(stage, pageNumber, embeddedQuestionPage));
      pageNumber += 1;

      for (const questionPage of remainingQuestionPages) {
        pages.push(buildQuestionPage(stage, questionPage, pageNumber));
        pageNumber += 1;
      }

      const nextStage = stages[index + 1];
      if (nextStage && stage.section !== nextStage.section) {
        pages.push(buildNoMaterialPage());
      }

      return;
    }

    for (const questionPage of questionPages) {
      pages.push(buildQuestionPage(stage, questionPage, pageNumber));
      pageNumber += 1;
    }

    const nextStage = stages[index + 1];
    if (nextStage && stage.section !== nextStage.section) {
      pages.push(buildNoMaterialPage());
    }
  });

  pages.push(buildAnswerKeyPage(testTitle, stages));

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(documentTitle || testTitle)}</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"
          integrity="sha384-5TcZemv2l/9On385z///+d7MSYlvIEw9FuZTIdZ14vJLqWphw7e7ZPuOiCHJcFCP"
          crossorigin="anonymous"
        />
        <style>${buildStyles().replaceAll("__ASSET_BASE__", normalizedAssetBaseUrl)}</style>
      </head>
      <body>
        <main class="sat-booklet">${pages.join("")}</main>
      </body>
    </html>
  `;
}
