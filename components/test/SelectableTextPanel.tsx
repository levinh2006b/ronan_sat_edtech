"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { useVocabBoard } from "@/components/vocab/VocabBoardProvider";

export type TextAnnotation = {
  id: string;
  start: number;
  end: number;
  color: string | null;
  underline: boolean;
};

type PendingSelection = {
  start: number;
  end: number;
};

type ToolbarState = {
  top: number;
  left: number;
  activeAnnotationId: string | null;
  pendingSelection: PendingSelection | null;
  pendingText: string;
};

interface SelectableTextPanelProps {
  annotations: TextAnnotation[];
  onChange: (annotations: TextAnnotation[]) => void;
  className?: string;
  children: ReactNode;
  sourceQuestionId?: string;
}

const HIGHLIGHT_COLORS = [
  { id: "yellow", value: "var(--color-primary)", label: "Yellow" },
  { id: "blue", value: "color-mix(in srgb, var(--color-accent-2) 20%, white)", label: "Blue" },
  { id: "pink", value: "color-mix(in srgb, var(--color-accent-1) 24%, white)", label: "Pink" },
] as const;

export default function SelectableTextPanel({
  annotations,
  onChange,
  className,
  children,
  sourceQuestionId,
}: SelectableTextPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nextAnnotationIdRef = useRef(0);
  const lastAppliedSignatureRef = useRef<string | null>(null);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const { addVocabCard } = useVocabBoard();
  const pendingSelection = toolbar?.pendingSelection ?? null;
  const pendingText = toolbar?.pendingText ?? "";

  const canSavePendingSelection = pendingText.length > 0 && pendingText.length <= 50;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const nextSignature = createRenderSignature(root, annotations);
    if (lastAppliedSignatureRef.current === nextSignature) {
      return;
    }

    unwrapAnnotations(root);

    const ordered = [...annotations].sort((left, right) => left.start - right.start);
    ordered.forEach((annotation) => {
      applyAnnotation(root, annotation);
    });

    lastAppliedSignatureRef.current = nextSignature;
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !pendingSelection) {
      return;
    }

    restorePendingSelection(root, pendingSelection);
  });

  useEffect(() => {
    if (!toolbar) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-annotation-toolbar]") || target.closest("[data-text-annotation-id]")) {
        return;
      }

      setToolbar(null);
      clearSelection();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setToolbar(null);
        clearSelection();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toolbar]);

  const openToolbarForSelection = () => {
    window.setTimeout(() => {
      const selection = window.getSelection();
      const root = rootRef.current;
      if (!selection || !root || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        return;
      }

      const clonedContents = range.cloneContents();
      if (clonedContents.querySelector?.("[data-text-annotation-id]")) {
        clearSelection();
        return;
      }

      const selectedText = selection.toString();
      if (!selectedText.trim()) {
        return;
      }

      const startRaw = getTextOffset(root, range.startContainer, range.startOffset);
      const endRaw = getTextOffset(root, range.endContainer, range.endOffset);
      
      // Đảm bảo start luôn nhỏ hơn end dù kéo chuột xuôi hay ngược
      const start = Math.min(startRaw, endRaw);
      const end = Math.max(startRaw, endRaw);
      
      if (start === end) {
        return;
      }

      const rect = range.getBoundingClientRect();
      setToolbar({
        top: Math.max(16, rect.top - 14),
        left: rect.left + rect.width / 2,
        activeAnnotationId: null,
        pendingSelection: { start, end },
        pendingText: getTextSlice(root, start, end),
      });
    }, 0);
  };

  const openToolbarForAnnotation = (element: HTMLElement, annotationId: string) => {
    const rect = element.getBoundingClientRect();
    clearSelection();

    setToolbar({
      top: Math.max(16, rect.top - 14),
      left: rect.left + rect.width / 2,
      activeAnnotationId: annotationId,
      pendingSelection: null,
      pendingText: "",
    });
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const annotationElement = target.closest("[data-text-annotation-id]") as HTMLElement | null;
    if (!annotationElement) {
      return;
    }

    event.stopPropagation();

    const annotationId = annotationElement.dataset.textAnnotationId;
    if (!annotationId) {
      return;
    }

    openToolbarForAnnotation(annotationElement, annotationId);
  };

  const upsertAnnotation = (payload: { color?: string | null; underline?: boolean }) => {
    if (!toolbar) {
      return;
    }

    if (toolbar.activeAnnotationId) {
      flushSync(() => {
        onChange(
          annotations.map((annotation) =>
            annotation.id === toolbar.activeAnnotationId
              ? {
                  ...annotation,
                  color: payload.color === undefined ? annotation.color : payload.color,
                  underline: payload.underline === undefined ? annotation.underline : payload.underline,
                }
              : annotation,
          ),
        );
        setToolbar((current) => (current ? { ...current } : current));
      });
      clearSelection();
      return;
    }

    if (!toolbar.pendingSelection) {
      return;
    }

    const { start, end } = toolbar.pendingSelection;
    const nextAnnotation: TextAnnotation = {
      id: `annotation-${nextAnnotationIdRef.current++}`,
      start,
      end,
      color: payload.color ?? null,
      underline: payload.underline ?? false,
    };

    flushSync(() => {
      onChange([...annotations, nextAnnotation]);
      setToolbar({
        ...toolbar,
        activeAnnotationId: nextAnnotation.id,
        pendingSelection: null,
        pendingText: "",
      });
    });
    clearSelection();
  };

  const removeActiveAnnotation = () => {
    if (!toolbar?.activeAnnotationId) {
      return;
    }

    onChange(annotations.filter((annotation) => annotation.id !== toolbar.activeAnnotationId));
    setToolbar(null);
    clearSelection();
  };

  const handleAddToVocab = () => {
    if (!canSavePendingSelection) {
      return;
    }

    addVocabCard(pendingText, sourceQuestionId);
    setToolbar(null);
    clearSelection();
  };

  const activeAnnotation = toolbar?.activeAnnotationId
    ? annotations.find((annotation) => annotation.id === toolbar.activeAnnotationId) ?? null
    : null;

  return (
    <>
      <div ref={rootRef} className={className} onMouseUp={openToolbarForSelection} onClick={handleClick}>
        {children}
      </div>

      {toolbar ? (
        <div
          data-annotation-toolbar
          onMouseDown={(event) => event.preventDefault()}
          className="fixed z-[100] flex flex-col items-center rounded-2xl border-2 border-ink-fg bg-surface-white px-2.5 py-2 brutal-shadow-sm"
          style={{
            top: toolbar.top,
            left: toolbar.left,
            transform: "translate(-50%, -100%)",
          }}
        >
          {canSavePendingSelection ? (
            <button
              type="button"
              onClick={handleAddToVocab}
              className="mb-1.5 rounded-full border-2 border-ink-fg bg-accent-1 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-fg brutal-shadow-sm workbook-press"
            >
              Add to Vocab
            </button>
          ) : null}

          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((color) => {
              const isActive = activeAnnotation?.color === color.value;

              return (
                <button
                  key={color.id}
                  type="button"
                  title={`Highlight ${color.label}`}
                  aria-label={`Highlight ${color.label}`}
                  onClick={() => upsertAnnotation({ color: color.value })}
                  className={`h-9 w-9 rounded-full border-2 border-ink-fg transition-transform workbook-press ${
                    isActive ? "scale-105" : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              );
            })}

            <button
              type="button"
              title="Underline"
              aria-label="Underline"
              onClick={() => upsertAnnotation({ underline: !(activeAnnotation?.underline ?? false) || !activeAnnotation })}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-fg text-ink-fg transition-colors workbook-press ${
                activeAnnotation?.underline ? "bg-paper-bg" : "bg-surface-white"
              }`}
            >
              <UnderlineIcon />
            </button>

            <button
              type="button"
              title="Remove annotation"
              aria-label="Remove annotation"
              onClick={removeActiveAnnotation}
              disabled={!activeAnnotation}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-fg bg-surface-white text-ink-fg transition-colors workbook-press disabled:cursor-not-allowed disabled:opacity-40"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function applyAnnotation(root: HTMLElement, annotation: TextAnnotation) {
  const range = createRangeFromOffsets(root, annotation.start, annotation.end);
  if (!range) {
    return;
  }

  const wrapper = document.createElement("span");
  wrapper.dataset.textAnnotationId = annotation.id;
  wrapper.style.backgroundColor = annotation.color ?? "transparent";
  wrapper.style.textDecorationLine = annotation.underline ? "underline" : "none";
  wrapper.style.textDecorationStyle = annotation.underline ? "dotted" : "solid";
  wrapper.style.textDecorationThickness = annotation.underline ? "2px" : "initial";
  wrapper.style.textUnderlineOffset = annotation.underline ? "0.24em" : "initial";
  wrapper.style.textDecorationColor = annotation.underline ? "var(--color-ink-fg)" : "transparent";
  wrapper.style.boxDecorationBreak = "clone";
  wrapper.style.setProperty("-webkit-box-decoration-break", "clone");
  wrapper.style.cursor = "pointer";
  wrapper.style.borderRadius = "2px";
  wrapper.style.transition = "filter 120ms ease, background-color 120ms ease, text-decoration-color 120ms ease";

  wrapper.addEventListener("mouseenter", () => {
    wrapper.style.filter = "brightness(0.94)";
    if (annotation.underline) {
      wrapper.style.textDecorationColor = "var(--color-ink-fg)";
    }
  });

  wrapper.addEventListener("mouseleave", () => {
    wrapper.style.filter = "brightness(1)";
    if (annotation.underline) {
      wrapper.style.textDecorationColor = "var(--color-ink-fg)";
    }
  });

  const fragment = range.extractContents();
  wrapper.appendChild(fragment);
  range.insertNode(wrapper);
}

function unwrapAnnotations(root: HTMLElement) {
  const wrappers = Array.from(root.querySelectorAll("[data-text-annotation-id]"));
  wrappers.forEach((wrapper) => {
    const parent = wrapper.parentNode;
    if (!parent) {
      return;
    }

    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }

    parent.removeChild(wrapper);
  });
}

function createRangeFromOffsets(root: HTMLElement, start: number, end: number) {
  if (start >= end) {
    return null;
  }

  const startPoint = resolveTextPoint(root, start);
  const endPoint = resolveTextPoint(root, end);

  if (!startPoint || !endPoint) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  return range;
}

function getTextOffset(root: HTMLElement, container: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);

  try {
    range.setEnd(container, offset);
  } catch {
    return 0;
  }

  return range.toString().length;
}

function getTextSlice(root: HTMLElement, start: number, end: number) {
  const fullText = getSelectableTextNodes(root)
    .map((node) => node.data)
    .join("");
  return fullText.slice(start, end).replace(/\s+/g, " ").trim();
}

function getSelectableTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parentElement = node.parentElement;
      if (!parentElement) {
        return NodeFilter.FILTER_REJECT;
      }

      if (parentElement.closest("[data-annotation-toolbar]")) {
        return NodeFilter.FILTER_REJECT;
      }

      if (parentElement.closest("annotation, semantics")) {
        return NodeFilter.FILTER_REJECT;
      }

      const computedStyle = window.getComputedStyle(parentElement);
      if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
        return NodeFilter.FILTER_REJECT;
      }

      if (parentElement.getAttribute("aria-hidden") === "true") {
        return NodeFilter.FILTER_REJECT;
      }

      if (!node.textContent?.length) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let currentNode: Node | null = null;
  while ((currentNode = walker.nextNode())) {
    nodes.push(currentNode as Text);
  }

  return nodes;
}



function resolveTextPoint(root: HTMLElement, absoluteOffset: number) {
  const textNodes = getSelectableTextNodes(root);
  if (textNodes.length === 0) {
    return null;
  }

  let currentOffset = 0;
  for (const node of textNodes) {
    const nextOffset = currentOffset + node.data.length;
    if (absoluteOffset <= nextOffset) {
      return {
        node,
        offset: Math.max(0, absoluteOffset - currentOffset),
      };
    }
    currentOffset = nextOffset;
  }

  const lastNode = textNodes[textNodes.length - 1];
  return {
    node: lastNode,
    offset: lastNode.data.length,
  };
}

function clearSelection() {
  const selection = window.getSelection();
  selection?.removeAllRanges();
}

function restorePendingSelection(root: HTMLElement, pendingSelection: PendingSelection) {
  const range = createRangeFromOffsets(root, pendingSelection.start, pendingSelection.end);
  const selection = window.getSelection();
  if (!range || !selection) {
    return;
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function createRenderSignature(root: HTMLElement, annotations: TextAnnotation[]) {
  const textContent = root.textContent ?? "";
  const orderedAnnotations = [...annotations]
    .sort((left, right) => left.start - right.start || left.end - right.end || left.id.localeCompare(right.id))
    .map((annotation) => ({
      id: annotation.id,
      start: annotation.start,
      end: annotation.end,
      color: annotation.color,
      underline: annotation.underline,
    }));

  return JSON.stringify({
    textContent,
    annotations: orderedAnnotations,
  });
}

function UnderlineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 4V9C6 11.2091 7.79086 13 10 13C12.2091 13 14 11.2091 14 9V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 16H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 2.6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.75 5.5H16.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 3.75H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 5.5V14.25C6 15.2165 6.7835 16 7.75 16H12.25C13.2165 16 14 15.2165 14 14.25V5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.25 8.25V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.75 8.25V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
