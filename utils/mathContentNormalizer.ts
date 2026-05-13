const DISPLAY_MATH_PLACEHOLDER = "\uE500";
const PLACEHOLDER_CLOSE = "\uE501";

const DISPLAY_MATH_RE = /\$\$[\s\S]*?\$\$/g;

interface CurrencyRule {
  pattern: RegExp;
  replacement: string;
}

const CURRENCY_ESCAPE_RULES: CurrencyRule[] = [
  // 0. Malformed percent math from scraped prompts: $0.4% -> \(0.4\%\)
  {
    pattern: /(?<!\\)\$(\d+(?:\.\d+)?)%(?!\$)/g,
    replacement: "\\($1\\%\\)",
  },

  // 0b. Malformed temperature math from scraped choices: $15.4^\circ C at...
  {
    pattern: /(?<!\\)\$(\d+(?:\.\d+)?)\^\\circ\s*C\b(?!\$)/g,
    replacement: "\\($1^\\circ C\\)",
  },

  // 0c. Malformed unit math before a prose sentence: $0.30 \text{...}^2\text{)}. In...
  {
    pattern: /(?<!\\)\$(\d+(?:\.\d+)?\s+\\text\{[^$]*?\\text\{\)\})(?=[.;,]?\s+[A-Z])/g,
    replacement: "\\($1\\)",
  },

  // 1. Currency Range: $5 - $10, $5-$10, $5\u2013$10, $5 \u2014 $10
  {
    pattern:
      /(?<!\\)(\$)\s?(\d[\d,]*\.?\d*)(\s*)([-–—])(\s*)(\$)\s?(\d[\d,]*\.?\d*)/g,
    replacement: "\\$1$2$3$4$5\\$6$7",
  },

  // 2. Negative Currency: -$500, - $500, -$ 500
  {
    pattern: /(-)\s*(?<!\\)(\$)\s?(\d[\d,]*\.?\d*)/g,
    replacement: "$1\\$2$3",
  },

  // 3. Country Prefix: US$50, CA$60, AU$100
  {
    pattern: /\b([A-Z]{2,3})(?<!\\)(\$)\s?(\d[\d,]*\.?\d*)/g,
    replacement: "$1\\$2$3",
  },

  // 4. Positive currency with comma groups or cents: $35,600.00, $1,250, $12.50
  {
    pattern: /(?<!\\)(\$)\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d{2})(?!\s*\\)(?=\b)/g,
    replacement: "\\$1$2",
  },

  // 5. Plain whole-dollar amounts followed by prose punctuation/space: $0), $5.
  {
    pattern: /(?<!\\)(\$)\s?(\d+)(?!\.\d)(?=[\s,.;:)])/g,
    replacement: "\\$1$2",
  },
];

const INLINE_MATH_DOLLAR_RE = /(?<!\\)\$(?!\$)([^$\n]+?)\$/g;

export function normalizeMathDelimiters(text: string): string {
  // Step 1: Protect display math blocks
  const displayBlocks: string[] = [];
  let result = text.replace(DISPLAY_MATH_RE, (match) => {
    displayBlocks.push(match);
    return `${DISPLAY_MATH_PLACEHOLDER}${displayBlocks.length - 1}${PLACEHOLDER_CLOSE}`;
  });

  // Step 2: Escape currency $ signs (ordered most-specific first)
  for (const { pattern, replacement } of CURRENCY_ESCAPE_RULES) {
    result = result.replace(pattern, replacement);
  }

  // Step 3: Convert remaining unprotected $...$ to standard \(...\) delimiters
  result = result.replace(
    INLINE_MATH_DOLLAR_RE,
    (_full: string, math: string) => `\\(${math}\\)`,
  );

  // Step 4: Restore display math blocks
  result = result.replace(
    new RegExp(`${DISPLAY_MATH_PLACEHOLDER}(\\d+)${PLACEHOLDER_CLOSE}`, "g"),
    (_full: string, idx: string) => displayBlocks[Number(idx)] ?? "",
  );

  return result;
}
