const DISPLAY_MATH_PLACEHOLDER = "\uE500";
const PLACEHOLDER_CLOSE = "\uE501";

const DISPLAY_MATH_RE = /\$\$[\s\S]*?\$\$/g;

interface CurrencyRule {
  pattern: RegExp;
  replacement: string;
}

const CURRENCY_ESCAPE_RULES: CurrencyRule[] = [
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
