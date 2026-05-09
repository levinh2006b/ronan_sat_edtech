"use client";

import { Fragment, createElement, useEffect, useState, type ReactNode } from "react";

import { renderKatexMarkup, tokenizeHtmlLatexContent } from "@/utils/latexTokenizer";
import { normalizeMathDelimiters } from "@/utils/mathContentNormalizer";

const ALLOWED_TAGS = new Set([
  "b",
  "br",
  "div",
  "em",
  "figcaption",
  "figure",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);
const HTML_TAG_PATTERN = /<\/?(?:b|br|div|em|figcaption|figure|i|img|li|ol|p|span|strong|sub|sup|table|tbody|td|th|thead|tr|u|ul)\b/i;

function renderLatexText(text: string, keyPrefix: string): ReactNode {
  const normalized = normalizeMathDelimiters(text);
  const segments = tokenizeHtmlLatexContent(normalized);
  if (segments.length === 1 && segments[0]?.type === "html") {
    return <Fragment key={keyPrefix}>{segments[0].value}</Fragment>;
  }

  return segments.map((segment, index) => {
    if (segment.type === "html") {
      return <Fragment key={`${keyPrefix}-text-${index}`}>{segment.value}</Fragment>;
    }

    return (
      <span
        key={`${keyPrefix}-math-${index}`}
        dangerouslySetInnerHTML={{ __html: renderKatexMarkup(segment.delimiter, segment.value) }}
      />
    );
  });
}

function getTagClassName(tagName: string) {
  switch (tagName) {
    case "p":
      return "mb-4 last:mb-0";
    case "ul":
      return "my-4 list-disc pl-6";
    case "ol":
      return "my-4 list-decimal pl-6";
    case "li":
      return "mb-1";
    case "table":
      return "my-4 w-full border-collapse overflow-hidden rounded-xl border-2 border-ink-fg bg-surface-white";
    case "thead":
      return "border-b-2 border-ink-fg bg-paper-bg";
    case "th":
      return "border-2 border-ink-fg px-3 py-2 text-left font-bold";
    case "td":
      return "border-2 border-ink-fg px-3 py-2 align-top";
    case "img":
      return "max-w-full h-auto rounded-lg";
    case "figure":
      return "my-4";
    case "figcaption":
      return "mt-2 text-center text-sm text-ink-fg/70 italic";
    default:
      return undefined;
  }
}

function renderRichNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) {
      return null;
    }

    return <Fragment key={key}>{renderLatexText(text, key)}</Fragment>;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) =>
    renderRichNode(child, `${key}-${index}`),
  );

  if (!ALLOWED_TAGS.has(tagName)) {
    return <Fragment key={key}>{children}</Fragment>;
  }

  if (tagName === "br") {
    return <br key={key} />;
  }

  const props: Record<string, string | number | boolean> & { key: string; className?: string } = { key };
  const defaultClassName = getTagClassName(tagName);

  if (defaultClassName) {
    props.className = defaultClassName;
  }

  for (let i = 0; i < element.attributes.length; i += 1) {
    const attr = element.attributes[i];
    let name = attr.name;

    if (name === "class") {
      props.className = props.className ? `${props.className} ${attr.value}` : attr.value;
      continue;
    }

    if (name === "colspan") name = "colSpan";
    if (name === "rowspan") name = "rowSpan";
    if (name === "style") continue;
    if (name.startsWith("on")) continue;

    props[name] = attr.value;
  }

  if (tagName === "img") {
    return createElement(tagName, props);
  }

  return createElement(tagName, props, children);
}

function containsAllowedHtml(text: string) {
  return HTML_TAG_PATTERN.test(text);
}

export default function RichTextWithLatex({
  text,
}: {
  text?: string;
  loosenTallInlineMath?: boolean;
}) {
  const [canParseHtml, setCanParseHtml] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setCanParseHtml(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!text) {
    return null;
  }

  let content: ReactNode;

  if (!containsAllowedHtml(text) || !canParseHtml) {
    content = renderLatexText(text, "plain");
  } else {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${text}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    content = root
      ? Array.from(root.childNodes).map((node, index) => renderRichNode(node, `rich-${index}`))
      : null;
  }

  return <>{content}</>;
}
