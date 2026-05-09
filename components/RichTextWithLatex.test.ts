import test from "node:test";
import assert from "node:assert/strict";

import { tokenizeHtmlLatexContent, type ContentSegment } from "@/utils/latexTokenizer";
import { normalizeMathDelimiters } from "@/utils/mathContentNormalizer";

function serializeMathSegment(segment: Extract<ContentSegment, { type: "math" }>) {
  if (segment.delimiter === "\\(") return `\\(${segment.value}\\)`;
  if (segment.delimiter === "\\[") return `\\[${segment.value}\\]`;
  return `${segment.delimiter}${segment.value}${segment.delimiter}`;
}

function tokenizeLatexSegments(text: string) {
  return tokenizeHtmlLatexContent(text).map((segment) => {
    if (segment.type === "html") {
      return { type: "text", value: segment.value };
    }

    return {
      type: "math",
      value: serializeMathSegment(segment),
      delimiter: segment.delimiter,
    };
  });
}

test("treats invalid inline dollars as plain text", () => {
  assert.deepEqual(tokenizeLatexSegments("Cost is $17 and $ 13"), [
    { type: "text", value: "Cost is $17 and $ 13" },
  ]);
});

test("turns escaped dollars into literal text", () => {
  assert.deepEqual(tokenizeLatexSegments("He deposited \\$3,600"), [
    { type: "text", value: "He deposited $3,600" },
  ]);
});

test("preserves math formulas that begin with numbers", () => {
  assert.deepEqual(tokenizeLatexSegments("$100x + y = 200$"), [
    { type: "math", value: "$100x + y = 200$", delimiter: "$" },
  ]);
});

test("rejects inline math when the opener is followed by whitespace", () => {
  assert.deepEqual(tokenizeLatexSegments("$ 100$"), [
    { type: "text", value: "$ 100$" },
  ]);
});

test("splits mixed text and inline math", () => {
  assert.deepEqual(tokenizeLatexSegments("The cost is $17$ per book"), [
    { type: "text", value: "The cost is " },
    { type: "math", value: "$17$", delimiter: "$" },
    { type: "text", value: " per book" },
  ]);
});

test("parses alternating inline math segments", () => {
  assert.deepEqual(tokenizeLatexSegments("Use $x$ and $y$"), [
    { type: "text", value: "Use " },
    { type: "math", value: "$x$", delimiter: "$" },
    { type: "text", value: " and " },
    { type: "math", value: "$y$", delimiter: "$" },
  ]);
});

test("parses display math with surrounding text", () => {
  assert.deepEqual(tokenizeLatexSegments("Before $$x + y$$ after"), [
    { type: "text", value: "Before " },
    { type: "math", value: "$$x + y$$", delimiter: "$$" },
    { type: "text", value: " after" },
  ]);
});

test("downgrades mismatched display math to plain text", () => {
  assert.deepEqual(tokenizeLatexSegments("Before $$x + y after"), [
    { type: "text", value: "Before $$x + y after" },
  ]);
});

test("keeps escaped dollars as text and still parses later math", () => {
  assert.deepEqual(tokenizeLatexSegments("Price is \\$5 and math is $x+1$"), [
    { type: "text", value: "Price is $5 and math is " },
    { type: "math", value: "$x+1$", delimiter: "$" },
  ]);
});

test("rejects inline math when the closer is preceded by whitespace", () => {
  assert.deepEqual(tokenizeLatexSegments("abc $x $"), [
    { type: "text", value: "abc $x $" },
  ]);
});

test("rejects inline math when the opener is followed by whitespace later in the string", () => {
  assert.deepEqual(tokenizeLatexSegments("abc $ x$"), [
    { type: "text", value: "abc $ x$" },
  ]);
});

test("parses display math even when surrounded by whitespace", () => {
  assert.deepEqual(tokenizeLatexSegments("$$  x + y  $$"), [
    { type: "math", value: "$$  x + y  $$", delimiter: "$$" },
  ]);
});

test("keeps a literal dollar before later inline math", () => {
  assert.deepEqual(tokenizeLatexSegments("\\$ $x$"), [
    { type: "text", value: "$ " },
    { type: "math", value: "$x$", delimiter: "$" },
  ]);
});

test("ignores escaped dollars inside inline math", () => {
  assert.deepEqual(tokenizeLatexSegments("Equation $x = \\$5$"), [
    { type: "text", value: "Equation " },
    { type: "math", value: "$x = \\$5$", delimiter: "$" },
  ]);
});

test("parses adjacent inline math segments correctly", () => {
  assert.deepEqual(tokenizeLatexSegments("$x$$y$"), [
    { type: "math", value: "$x$", delimiter: "$" },
    { type: "math", value: "$y$", delimiter: "$" },
  ]);
});


test("handles a single trailing dollar sign without crashing", () => {
  assert.deepEqual(tokenizeLatexSegments("Trailing dollar $"), [
    { type: "text", value: "Trailing dollar $" },
  ]);
});

test("rejects when math spans across numbers ending in dollars", () => {
  assert.deepEqual(tokenizeLatexSegments("Món A giá 100$ và món B giá 200$"), [
    { type: "text", value: "Món A giá 100$ và món B giá 200$" },
  ]);
});

test("parses multi-line display math", () => {
  assert.deepEqual(tokenizeLatexSegments("$$\n a + b \n$$"), [
    { type: "math", value: "$$\n a + b \n$$", delimiter: "$$" },
  ]);
});


test("handles empty inline or display math without crashing", () => {
  assert.deepEqual(tokenizeLatexSegments("$$"), [
    { type: "text", value: "$$" }, // Hoặc type: "math", tùy logic ứng dụng của bạn
  ]);
  assert.deepEqual(tokenizeLatexSegments("$$$$"), [
    { type: "text", value: "$$$$" },
  ]);
});



test("handles a text dollar sign followed immediately by display math", () => {
  assert.deepEqual(tokenizeLatexSegments("Giá $$$x+1$$"), [
    { type: "text", value: "Giá $" },
    { type: "math", value: "$$x+1$$", delimiter: "$$" },
  ]);
});



test("differentiates escaped backslash from escaped dollar", () => {
  // Trong file js, "\\\\" đại diện cho "\\" ở chuỗi thực tế
  assert.deepEqual(tokenizeLatexSegments("Dùng \\\\$x$"), [
    { type: "text", value: "Dùng \\\\" },
    { type: "math", value: "$x$", delimiter: "$" },
  ]);
});

test("parses inline math correctly when followed by punctuation", () => {
  assert.deepEqual(tokenizeLatexSegments("Nghiệm là $x=5$."), [
    { type: "text", value: "Nghiệm là " },
    { type: "math", value: "$x=5$", delimiter: "$" },
    { type: "text", value: "." },
  ]);
});


test("parses inline math enclosed in parentheses", () => {
  assert.deepEqual(tokenizeLatexSegments("(với $x > 0$)"), [
    { type: "text", value: "(với " },
    { type: "math", value: "$x > 0$", delimiter: "$" },
    { type: "text", value: ")" },
  ]);
});


test("rejects inline math that spans across multiple paragraphs", () => {
  // \n\n đại diện cho việc ngắt sang một đoạn văn (paragraph) mới
  assert.deepEqual(tokenizeLatexSegments("Đoạn 1 $bắt đầu\n\nĐoạn 2 kết thúc$"), [
    { type: "text", value: "Đoạn 1 $bắt đầu\n\nĐoạn 2 kết thúc$" },
  ]);
});

test("rejects inline math when opener is followed by a non-breaking space", () => {
  // \xA0 là đại diện cho non-breaking space trong chuỗi Javascript
  assert.deepEqual(tokenizeLatexSegments("Giá $\xA0100$"), [
    { type: "text", value: "Giá $\xA0100$" },
  ]);
});

test("ignores escaped dollar sign when it appears at the closing position", () => {
  // Chuỗi thực tế: $x = 5\$ $y$
  // Kết quả mong muốn: Dấu $ thứ 2 bị escape nên cụm toán kéo dài đến tận dấu $ cuối cùng.
  assert.deepEqual(tokenizeLatexSegments("$x = 5\\$ $y$"), [
    { type: "math", value: "$x = 5\\$ $y$", delimiter: "$" },
  ]);
});

test("parses inline math directly attached to a preceding word", () => {
  assert.deepEqual(tokenizeLatexSegments("Nghiệm$x=2$"), [
    { type: "text", value: "Nghiệm" },
    { type: "math", value: "$x=2$", delimiter: "$" },
  ]);
});

test("downgrades unclosed inline math at the end of the string to plain text", () => {
  assert.deepEqual(tokenizeLatexSegments("Đoạn text có $ chứa công thức mở"), [
    { type: "text", value: "Đoạn text có $ chứa công thức mở" },
  ]);
});


test("parses standard LaTeX inline math parentheses", () => {
  assert.deepEqual(tokenizeLatexSegments("D\u00f9ng \\(x+y\\) nh\u00e9"), [
    { type: "text", value: "D\u00f9ng " },
    { type: "math", value: "\\(x+y\\)", delimiter: "\\(" },
    { type: "text", value: " nh\u00e9" },
  ]);
});

test("rejects parenthesized narrative text as math via word count gate", () => {
  assert.deepEqual(tokenizeLatexSegments("$(a quick note)$"), [
    { type: "text", value: "$(a quick note)$" },
  ]);
});

test("normalizer escapes currency range to prevent false math pairing", () => {
  const normalized = normalizeMathDelimiters("The range is $5 - $10 dollars.");
  assert.deepEqual(tokenizeLatexSegments(normalized), [
    { type: "text", value: "The range is $5 - $10 dollars." },
  ]);
  const tight = normalizeMathDelimiters("$5-$10");
  assert.deepEqual(tokenizeLatexSegments(tight), [
    { type: "text", value: "$5-$10" },
  ]);
});

test("tolerates a single space between dollar sign and number as currency text", () => {
  assert.deepEqual(tokenizeLatexSegments("$ 1,250.50"), [
    { type: "text", value: "$ 1,250.50" },
  ]);
});

test("treats trailing dollar sign on a number as plain text", () => {
  assert.deepEqual(tokenizeLatexSegments("The cost is 50$."), [
    { type: "text", value: "The cost is 50$." },
  ]);
});

test("parses inline math when followed by a hyphen", () => {
  assert.deepEqual(tokenizeLatexSegments("In the $xy$-plane"), [
    { type: "text", value: "In the " },
    { type: "math", value: "$xy$", delimiter: "$" },
    { type: "text", value: "-plane" },
  ]);
});
