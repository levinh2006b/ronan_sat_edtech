/**
 * Renders text that may contain a mix of HTML markup and LaTeX math delimiters
 * ($...$, $$...$$, \(...\), \[...\]).
 * Plain-text segments are rendered via dangerouslySetInnerHTML so HTML tags in the database
 * are interpreted by the browser instead of being printed as raw text.
 */

import type { ReactNode } from "react";

import {
  hasTallMath,
  renderKatexMarkup,
  tokenizeHtmlLatexContent,
  type ContentSegment,
} from "@/utils/latexTokenizer";
import { normalizeMathDelimiters } from "@/utils/mathContentNormalizer";

export { hasTallMath, renderKatexMarkup, tokenizeHtmlLatexContent, type ContentSegment };

export function renderHtmlLatexContent(text: string | undefined): ReactNode {
  if (!text) return "";

  const normalized = normalizeMathDelimiters(text);
  const segments = tokenizeHtmlLatexContent(normalized);
  return segments.map((segment) => {
    if (segment.type === "math") {
      return (
        <span
          key={`math-${segment.start}-${segment.delimiter}`}
          dangerouslySetInnerHTML={{ __html: renderKatexMarkup(segment.delimiter, segment.value) }}
        />
      );
    }

    return (
      <span
        key={`html-${segment.start}`}
        dangerouslySetInnerHTML={{ __html: segment.value }}
      />
    );
  });
}
