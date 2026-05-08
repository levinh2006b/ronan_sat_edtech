const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["\u00e2\u20ac\u2122", "\u2019"],
  ["\u00e2\u20ac\u02dc", "\u2018"],
  ["\u00e2\u20ac\u0153", "\u201c"],
  ["\u00e2\u20ac\ufffd", "\u201d"],
  ["\u00e2\u20ac\u009d", "\u201d"],
  ["\u00e2\u20ac\u00a6", "\u2026"],
  ["\u00e2\u20ac\u201c", "\u2013"],
  ["\u00e2\u20ac\u201d", "\u2014"],
  ["\u00e2\u2030\u00a4", "\u2264"],
  ["\u00e2\u2030\u00a5", "\u2265"],
  ["\u00e2\u02c6\u0161", "\u221a"],
  ["\u00e2\u02c6\u2019", "\u2212"],
  ["\u00e2\u02c6\u00a0", "\u2220"],
  ["\u00e2\u2013\u00b3", "\u25b3"],
  ["\u00e2\u0081\u201e", "\u2044"],
  ["\u00cf\u20ac", "\u03c0"],
  ["\u00ce\u00b8", "\u03b8"],
  ["\u00c2\u00b0", "\u00b0"],
  ["\u00c2\u00b1", "\u00b1"],
  ["\u00c2\u00b2", "\u00b2"],
  ["\u00c2\u00b3", "\u00b3"],
  ["\u00c2\u00bc", "\u00bc"],
  ["\u00c2\u00bd", "\u00bd"],
  ["\u00c2\u00be", "\u00be"],
  ["\u00c3\u2014", "\u00d7"],
  ["\u00c3\u00b7", "\u00f7"],
  ["\u00c2\u00a0", " "],
];

const HTML_BLOCK_PATTERN = /<\/?(?:blockquote|p|div|ul|ol|li|table|thead|tbody|tr|td|th|br|img|svg|figure|figcaption|section|article|h[1-6])\b/i;
const MATH_PLACEHOLDER_PATTERN = /\\\((?:.|\n)*?\\\)|\\\[(?:.|\n)*?\\\]|\$\$(?:.|\n)*?\$\$|\$(?!\$)[^\n$]+?\$/g;
const UNDERLINE_BLANK_HTML = '<u class="question-blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>';

function replaceAllLiteral(value: string, search: string, replacement: string) {
  return value.split(search).join(replacement);
}

export function repairScrapedMojibake(value: string) {
  let normalized = value;

  for (const [bad, good] of MOJIBAKE_REPLACEMENTS) {
    normalized = replaceAllLiteral(normalized, bad, good);
  }

  return normalized.replace(/\u00a0/g, " ");
}

function hasHtmlBlock(value: string) {
  return HTML_BLOCK_PATTERN.test(value);
}

function shouldStayStrong(content: string) {
  const plain = content.replace(/<[^>]+>/g, "").trim();
  return /^Text\s+\d+$/i.test(plain) || /^[A-Z][A-Z\s.'-]{2,}:$/.test(plain);
}

function renderStrongOrUnderline(content: string) {
  return shouldStayStrong(content) ? `<strong>${content}</strong>` : `<u>${content}</u>`;
}

function repairLegacyStrongUnderline(value: string) {
  return value.replace(/<strong>([\s\S]*?)<\/strong>/g, (_, content: string) => renderStrongOrUnderline(content));
}

export function normalizeScrapedBaseText(value: string) {
  const mathPlaceholders: string[] = [];
  return repairScrapedMojibake(value)
    .replace(MATH_PLACEHOLDER_PATTERN, (match) => {
      mathPlaceholders.push(match);
      return `\uE300${mathPlaceholders.length - 1}\uE301`;
    })
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<strong><em><\/strong><\/em>|<em><strong><\/em><\/strong>|<strong><em><\/em><\/strong>/g, UNDERLINE_BLANK_HTML)
    .replace(/\uE300(\d+)\uE301/g, (_, index: string) => mathPlaceholders[Number(index)] ?? "")
    .trim();
}

function convertMarkdownInline(value: string) {
  const placeholders: string[] = [];
  const protectedValue = value
    .replace(MATH_PLACEHOLDER_PATTERN, (match) => {
      placeholders.push(match);
      return `\uE200${placeholders.length - 1}\uE201`;
    })
    .replace(/<[^>]+>/g, (match) => {
      placeholders.push(match);
      return `\uE200${placeholders.length - 1}\uE201`;
    });

  const withUnderlineBlanks = protectedValue.replace(/_{3,}/g, UNDERLINE_BLANK_HTML);

  return withUnderlineBlanks
    .replace(/\*\*([\s\S]*?\S)\*\*/g, (_, content: string) => renderStrongOrUnderline(content))
    .replace(/__([\s\S]*?\S)__/g, "<u>$1</u>")
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/\uE200(\d+)\uE201/g, (_, index: string) => placeholders[Number(index)] ?? "");
}

function convertMarkdownBlocks(value: string) {
  const lines = value.split("\n");
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let quoteLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push(paragraphLines.join("<br>"));
    paragraphLines = [];
  };

  const flushQuote = () => {
    if (quoteLines.length === 0) {
      return;
    }

    blocks.push(`<blockquote>${quoteLines.join("<br>")}</blockquote>`);
    quoteLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushQuote();
      flushParagraph();
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      quoteLines.push(quoteMatch[1].trim());
      continue;
    }

    flushQuote();
    paragraphLines.push(trimmed);
  }

  flushQuote();
  flushParagraph();

  return blocks.join("<br><br>");
}

function renderHtmlLineBreaks(value: string) {
  return value.replace(/(<br\s*\/?>)\n+/gi, "$1").replace(/\n/g, "<br>");
}

export function normalizeScrapedMarkdownHtml(value: string) {
  const normalized = normalizeScrapedBaseText(value);

  if (!normalized) {
    return "";
  }

  const withInlineHtml = convertMarkdownInline(normalized);
  const withRepairedStrong = repairLegacyStrongUnderline(withInlineHtml);
  return hasHtmlBlock(withRepairedStrong) ? renderHtmlLineBreaks(withRepairedStrong) : convertMarkdownBlocks(withRepairedStrong);
}
