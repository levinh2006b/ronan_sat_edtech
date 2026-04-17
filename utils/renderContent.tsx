/**
 * Renders text that may contain a mix of HTML markup and LaTeX math delimiters ($...$, $$...$$).
 * Plain-text segments are rendered via dangerouslySetInnerHTML so HTML tags in the database
 * are interpreted by the browser instead of being printed as raw text.
 * Math segments are rendered by react-latex-next.
 */

import type { ReactNode } from "react";
import Latex from "react-latex-next";

const MATH_DELIMITER_PATTERN = /(?<!\\)(\$\$?)(.*?)(?<!\\)\1/gs;
const TALL_MATH_PATTERN = /\\(?:d?frac)|\^(?:\{[^}]+\}|\S)/;

export function hasTallMath(text: string | undefined): boolean {
  if (!text) return false;
  return TALL_MATH_PATTERN.test(text);
}

function normalizeMath(delimiter: string, mathText: string): string {
  const normalizedMath = mathText.trim();
  if (delimiter === "$" && hasTallMath(normalizedMath)) {
    return `$\\displaystyle ${normalizedMath.replace(/\\frac/g, "\\dfrac")}$`;
  }
  return `${delimiter}${mathText}${delimiter}`;
}

/**
 * Splits `text` at LaTeX delimiters and returns a React node array where
 * - plain segments are rendered with dangerouslySetInnerHTML (so HTML is parsed),
 * - math segments are rendered with <Latex>.
 */
export function renderHtmlLatexContent(text: string | undefined): ReactNode {
  if (!text) return "";

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MATH_DELIMITER_PATTERN)) {
    const delimiter = match[1];
    const mathText = match[2] ?? "";
    const matchIndex = match.index ?? 0;
    const plainHtml = text.slice(lastIndex, matchIndex);

    if (plainHtml) {
      parts.push(
        <span
          key={`html-${lastIndex}`}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: plainHtml }}
        />,
      );
    }

    const renderedMath = normalizeMath(delimiter, mathText);
    parts.push(<Latex key={`math-${matchIndex}-${delimiter}`}>{renderedMath}</Latex>);
    lastIndex = matchIndex + match[0].length;
  }

  const trailingHtml = text.slice(lastIndex);
  if (trailingHtml) {
    parts.push(
      <span
        key={`html-trailing`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: trailingHtml }}
      />,
    );
  }

  return parts.length > 0 ? parts : (
    <span
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}
