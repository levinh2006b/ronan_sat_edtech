import katex from "katex";

const TALL_MATH_PATTERN = /\\(?:d?frac)|\^(?:\{[^}]+\}|\S)/;

export type ContentSegment =
  | { type: "html"; value: string; start: number }
  | { type: "math"; delimiter: "$" | "$$" | "\\(" | "\\["; value: string; start: number };

export function hasTallMath(text: string | null | undefined): boolean {
  if (!text) return false;
  return TALL_MATH_PATTERN.test(text);
}

function normalizeMathText(delimiter: "$" | "$$" | "\\(" | "\\[", mathText: string): string {
  const normalizedMath = mathText.trim();
  if ((delimiter === "$" || delimiter === "\\(") && hasTallMath(normalizedMath)) {
    return `\\displaystyle ${normalizedMath.replace(/\\frac/g, "\\dfrac")}`;
  }
  return normalizedMath;
}

export function renderKatexMarkup(delimiter: "$" | "$$" | "\\(" | "\\[", mathText: string) {
  return katex.renderToString(normalizeMathText(delimiter, mathText), {
    displayMode: delimiter === "$$" || delimiter === "\\[",
    throwOnError: false,
    strict: "ignore",
    output: "html",
  });
}

function isEscapedDollar(text: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function isWhitespaceChar(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

function isMathContent(value: string): boolean {
  const content = value.trim();
  if (!content) return false;

  // Strong math indicators: backslash, exponents, braces, equals, addition, multiplication, inequalities
  if (/\\[a-zA-Z%&#_{}~|]+|[\^{}=+*<>]/.test(content)) return true;

  if (/[a-zA-Z]/.test(content)) {
    const words = content.match(/[a-zA-Z]+/g) ?? [];
    if (words.length > 2) return false;
    // Allow letters, digits, spaces, basic punctuation, parentheses, dashes
    return /^[\d\s.,;:a-zA-Z()\-]+$/.test(content);
  }

  // No letters: accept coordinate notation, negative numbers, short expressions
  return /^[\d\s.,;:()\-]+$/.test(content) && content.length <= 12;
}

function isValidInlineMathOpener(text: string, index: number): boolean {
  const after = text[index + 1];
  return after !== undefined && !isWhitespaceChar(after);
}

function isValidInlineMathCloser(text: string, index: number, openerIndex: number): boolean {
  if (isEscapedDollar(text, index)) return false;

  const before = text[index - 1];
  const after = text[index + 1];
  if (isWhitespaceChar(before)) return false;

  const content = text.slice(openerIndex + 1, index);
  if (!isMathContent(content)) return false;

  return after === undefined || /[\s,.;:!?()[\]{}<>"'\u2018\u2019\u201c\u201d\`$\u2013\u2014\u2026-]/.test(after);
}

function findInlineDollarCloser(text: string, openerIndex: number): number {
  for (let cursor = openerIndex + 1; cursor < text.length; cursor += 1) {
    if (text[cursor] === "$" && isValidInlineMathCloser(text, cursor, openerIndex)) {
      return cursor;
    }
  }

  return -1;
}

function unescapeLiteralDollars(value: string): string {
  return value.replace(/\\\$/g, "$");
}

function pushHtmlSegment(segments: ContentSegment[], text: string, start: number, end: number) {
  if (end > start) {
    segments.push({ type: "html", value: unescapeLiteralDollars(text.slice(start, end)), start });
  }
}

export function tokenizeHtmlLatexContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let cursor = 0;
  let plainStart = 0;

  while (cursor < text.length) {
    const nextTwo = text.slice(cursor, cursor + 2);

    if (text.slice(cursor, cursor + 3) === "$$$") {
      cursor += 1;
      continue;
    }

    if (nextTwo === "\\(" || nextTwo === "\\[") {
      const closer = nextTwo === "\\(" ? "\\)" : "\\]";
      const closeIndex = text.indexOf(closer, cursor + 2);
      if (closeIndex !== -1 && closeIndex > cursor + 2) {
        pushHtmlSegment(segments, text, plainStart, cursor);
        segments.push({
          type: "math",
          delimiter: nextTwo,
          value: text.slice(cursor + 2, closeIndex),
          start: cursor,
        });
        cursor = closeIndex + 2;
        plainStart = cursor;
        continue;
      }
    }

    if (nextTwo === "$$" && !isEscapedDollar(text, cursor)) {
      const closeIndex = text.indexOf("$$", cursor + 2);
      if (closeIndex !== -1) {
        pushHtmlSegment(segments, text, plainStart, cursor);
        segments.push({
          type: "math",
          delimiter: "$$",
          value: text.slice(cursor + 2, closeIndex),
          start: cursor,
        });
        cursor = closeIndex + 2;
        plainStart = cursor;
        continue;
      }
    }

    if (text[cursor] === "$" && !isEscapedDollar(text, cursor) && isValidInlineMathOpener(text, cursor)) {
      const closeIndex = findInlineDollarCloser(text, cursor);
      if (closeIndex !== -1) {
        pushHtmlSegment(segments, text, plainStart, cursor);
        segments.push({
          type: "math",
          delimiter: "$",
          value: text.slice(cursor + 1, closeIndex),
          start: cursor,
        });
        cursor = closeIndex + 1;
        plainStart = cursor;
        continue;
      }
    }

    cursor += 1;
  }

  pushHtmlSegment(segments, text, plainStart, text.length);
  return segments;
}
