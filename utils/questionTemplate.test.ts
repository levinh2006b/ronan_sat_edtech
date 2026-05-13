import test from "node:test";
import assert from "node:assert/strict";

import { MATH_SECTION } from "@/lib/sections";
import { generatePDFTemplate } from "@/utils/questionTemplate";

test("PDF template renders Math LaTeX variants without KaTeX error spans", async () => {
  const html = await generatePDFTemplate({
    testId: "00000000-0000-0000-0000-000000000001",
    testTitle: "Math PDF Render Test",
    sectionName: MATH_SECTION,
    questions: [
      {
        order: 1,
        section: MATH_SECTION,
        module: 1,
        questionType: "multiple_choice",
        passage: "$f(x)=x^2-4x-780$<br><br>$g(x)=\\sqrt [4]{x}+\\left (x+1\\right )$",
        questionText: "A store collected $35,600.00 and used the table below.\n\n| x | y |\n| --- | --- |\n| $x^2$ | \\(y=2x+1\\) |",
        choices: ["$x^2+1$", "\\(\\frac {1}{2}x\\)", "No solution", "$5 - $10"],
        correctAnswer: "$x^2+1$",
      },
    ],
  });

  assert.equal(html.includes("katex-error"), false);
  assert.equal(html.includes("$35,600.00"), true);
  assert.equal(html.includes("pdf-content-table"), true);
  assert.equal(html.includes("display-math-block"), true);
});

test("PDF template repairs scraped mojibake before rendering", async () => {
  const html = await generatePDFTemplate({
    testId: "00000000-0000-0000-0000-000000000002",
    testTitle: "Mojibake PDF Render Test",
    questions: [
      {
        order: 1,
        section: "Reading and Writing",
        module: 1,
        questionType: "multiple_choice",
        passage: "The researcherâ€™s claim uses a 30Â° angle.",
        questionText: "Which choice best describes the textâ€™s purpose?",
        choices: ["Itâ€™s a summary.", "It is unrelated.", "It is impossible.", "It repeats data."],
        correctAnswer: "Itâ€™s a summary.",
      },
    ],
  });

  assert.equal(html.includes("researcherâ€™s"), false);
  assert.equal(html.includes("researcher\u2019s"), true);
  assert.equal(html.includes("30\u00b0"), true);
  assert.equal(html.includes("text\u2019s"), true);
});

test("PDF template repairs and renders bare exponential equation choices", async () => {
  const html = await generatePDFTemplate({
    testId: "00000000-0000-0000-0000-000000000003",
    testTitle: "Exponential Equation PDF Render Test",
    sectionName: MATH_SECTION,
    questions: [
      {
        order: 1,
        section: MATH_SECTION,
        module: 1,
        questionType: "multiple_choice",
        questionText: "Which equation is the most appropriate exponential model?",
        choices: ["y=34(1.04)−x", "y=34(1.04)^{x}", "y=285(1.04)−x", "y=285(1.04)^{x}"],
        correctAnswer: "y=34(1.04)^{x}",
      },
    ],
  });

  assert.equal(html.includes("katex-error"), false);
  assert.equal(html.includes("y=34(1.04)−x"), false);
  assert.equal(html.includes("y=34(1.04)^{x}"), false);
  assert.equal(html.includes("y=34(1.04)^{-x}"), false);
  assert.match(html, /class="katex"/);
});
