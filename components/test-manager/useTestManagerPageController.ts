"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { useTestManagerBoard, type TestManagerCard, type TestManagerColumn, type TestManagerColumnColorKey } from "@/components/test-manager/TestManagerBoardProvider";

export type TestManagerDropIndicatorState = {
  columnId: string;
  position: "before" | "after";
};

function isTestManagerCard(card: TestManagerCard | undefined): card is TestManagerCard {
  return Boolean(card);
}

export function useTestManagerPageController() {
  const {
    board,
    hydrated,
    createColumn,
    moveCard,
    updateColumnTitle,
    updateColumnColor,
    removeColumn,
    reorderColumns,
  } = useTestManagerBoard();

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<TestManagerDropIndicatorState | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const dragClientXRef = useRef<number | null>(null);

  const inboxCards = useMemo(() => board.inboxIds.map((id) => board.cards[id]).filter(isTestManagerCard), [board.cards, board.inboxIds]);

  useEffect(() => {
    if (!openMenuColumnId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) {
        return;
      }

      setOpenMenuColumnId(null);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuColumnId]);

  useEffect(() => {
    if (!draggingColumnId) {
      return;
    }

    let frameId = 0;
    const tick = () => {
      const container = boardScrollRef.current;
      const clientX = dragClientXRef.current;
      if (container && clientX !== null) {
        const rect = container.getBoundingClientRect();
        const threshold = 72;
        const maxSpeed = 18;

        if (clientX < rect.left + threshold) {
          const strength = 1 - Math.max(0, clientX - rect.left) / threshold;
          container.scrollLeft -= Math.ceil(maxSpeed * strength);
        } else if (clientX > rect.right - threshold) {
          const strength = 1 - Math.max(0, rect.right - clientX) / threshold;
          container.scrollLeft += Math.ceil(maxSpeed * strength);
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [draggingColumnId]);

  useEffect(() => {
    if (!draggingColumnId) {
      return;
    }

    const cleanup = () => {
      window.setTimeout(() => {
        setDraggingColumnId(null);
        setDropIndicator(null);
        dragClientXRef.current = null;
        if (dragPreviewRef.current) {
          dragPreviewRef.current.remove();
          dragPreviewRef.current = null;
        }
      }, 0);
    };

    window.addEventListener("dragend", cleanup);
    window.addEventListener("drop", cleanup);

    return () => {
      window.removeEventListener("dragend", cleanup);
      window.removeEventListener("drop", cleanup);
    };
  }, [draggingColumnId]);

  const handleCreateColumn = () => {
    const createdId = createColumn(newColumnTitle);
    if (!createdId) {
      return;
    }

    setIsAddingColumn(false);
    setNewColumnTitle("");
  };

  const cancelCreateColumn = () => {
    setNewColumnTitle("");
    setIsAddingColumn(false);
  };

  const startEditColumn = (column: TestManagerColumn) => {
    setEditingColumnId(column.id);
    setEditingColumnTitle(column.title);
    setOpenMenuColumnId(null);
  };

  const saveColumnEdit = () => {
    if (!editingColumnId) {
      return;
    }

    updateColumnTitle(editingColumnId, editingColumnTitle);
    setEditingColumnId(null);
    setEditingColumnTitle("");
  };

  const cancelColumnEdit = () => {
    setEditingColumnId(null);
    setEditingColumnTitle("");
  };

  const toggleColumnMenu = (columnId: string) => {
    setOpenMenuColumnId((current) => (current === columnId ? null : columnId));
  };

  const handleChangeColumnColor = (columnId: string, colorKey: TestManagerColumnColorKey) => {
    updateColumnColor(columnId, colorKey);
    setOpenMenuColumnId(null);
  };

  const handleRemoveColumn = (columnId: string) => {
    removeColumn(columnId);
    setOpenMenuColumnId(null);
  };

  const handleDropCardToBucket = (destination: string) => {
    if (draggingCardId) {
      moveCard(draggingCardId, destination);
      setDraggingCardId(null);
    }
  };

  const handleColumnDragStart = (event: DragEvent, columnId: string) => {
    const shell = (event.currentTarget as HTMLElement).closest("[data-column-shell]") as HTMLElement | null;
    if (!shell) {
      return;
    }

    setDraggingColumnId(columnId);
    dragClientXRef.current = event.clientX;

    const preview = shell.cloneNode(true) as HTMLElement;
    preview.style.position = "fixed";
    preview.style.top = "-10000px";
    preview.style.left = "-10000px";
    preview.style.width = `${shell.offsetWidth}px`;
    preview.style.pointerEvents = "none";
    preview.style.transform = "rotate(5deg)";
    preview.style.opacity = "0.9";
    preview.style.filter = "saturate(0.92)";
    preview.style.boxShadow = "0 28px 60px rgba(15, 23, 42, 0.28)";
    preview.style.zIndex = "9999";
    document.body.appendChild(preview);
    dragPreviewRef.current = preview;

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", columnId);
    event.dataTransfer.setDragImage(preview, 90, 36);
  };

  const clearColumnDragState = () => {
    setDraggingColumnId(null);
    setDropIndicator(null);
    dragClientXRef.current = null;
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove();
      dragPreviewRef.current = null;
    }
  };

  const handleColumnDragOver = (event: DragEvent, columnId: string) => {
    if (!draggingColumnId || draggingColumnId === columnId) {
      return;
    }

    event.preventDefault();
    dragClientXRef.current = event.clientX;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    setDropIndicator({ columnId, position });
  };

  const handleColumnDrop = (columnId: string) => {
    if (!draggingColumnId || draggingColumnId === columnId || !dropIndicator) {
      clearColumnDragState();
      return;
    }

    reorderColumns(draggingColumnId, columnId, dropIndicator.position);
    clearColumnDragState();
  };

  const handleBoardDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (draggingColumnId) {
      event.preventDefault();
      dragClientXRef.current = event.clientX;
    }
  };

  const handleBoardDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingColumnId || !dropIndicator) {
      return;
    }

    event.preventDefault();
    handleColumnDrop(dropIndicator.columnId);
  };

  return {
    board,
    hydrated,
    inboxCards,
    draggingColumnId,
    dropIndicator,
    isAddingColumn,
    newColumnTitle,
    editingColumnId,
    editingColumnTitle,
    openMenuColumnId,
    menuRef,
    boardScrollRef,
    setDraggingCardId,
    setEditingColumnTitle,
    setIsAddingColumn,
    setNewColumnTitle,
    handleCreateColumn,
    cancelCreateColumn,
    startEditColumn,
    saveColumnEdit,
    cancelColumnEdit,
    toggleColumnMenu,
    handleChangeColumnColor,
    handleRemoveColumn,
    handleDropCardToBucket,
    handleColumnDragStart,
    clearColumnDragState,
    handleColumnDragOver,
    handleColumnDrop,
    handleBoardDragOver,
    handleBoardDrop,
  };
}
