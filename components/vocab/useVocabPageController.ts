"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import {
  useVocabBoard,
  type VocabCard,
  type VocabColumn,
  type VocabColumnColorKey,
} from "@/components/vocab/VocabBoardProvider";
import { parseFlashCardText } from "@/components/vocab/flashCardUtils";
import type { DropIndicatorState, FlashCardModalState } from "@/components/vocab/vocabPage.types";

function isVocabCard(card: VocabCard | undefined): card is VocabCard {
  return Boolean(card);
}

export function useVocabPageController() {
  const {
    board,
    hydrated,
    addVocabCard,
    createColumn,
    moveCard,
    removeCard,
    updateCardText,
    updateColumnTitle,
    updateColumnColor,
    removeColumn,
    reorderColumns,
  } = useVocabBoard();

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [draftByBucket, setDraftByBucket] = useState<Record<string, string>>({});
  const [openComposerByBucket, setOpenComposerByBucket] = useState<Record<string, boolean>>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardText, setEditingCardText] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  const [flashCardModal, setFlashCardModal] = useState<FlashCardModalState | null>(null);
  const [flashCardIndex, setFlashCardIndex] = useState(0);
  const [isFlashCardAnswerVisible, setIsFlashCardAnswerVisible] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const dragClientXRef = useRef<number | null>(null);

  const inboxCards = useMemo(() => board.inboxIds.map((id) => board.cards[id]).filter(isVocabCard), [board.cards, board.inboxIds]);

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
    if (!flashCardModal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFlashCardModal(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setFlashCardIndex((current) => {
          const nextIndex = Math.min(current + 1, flashCardModal.cards.length - 1);
          if (nextIndex !== current) {
            setIsFlashCardAnswerVisible(false);
          }

          return nextIndex;
        });
      }

      if (event.key === "ArrowLeft") {
        setFlashCardIndex((current) => {
          const nextIndex = Math.max(current - 1, 0);
          if (nextIndex !== current) {
            setIsFlashCardAnswerVisible(false);
          }

          return nextIndex;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flashCardModal]);

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

  const resetBucketComposer = (bucketId: string) => {
    setDraftByBucket((previous) => ({ ...previous, [bucketId]: "" }));
    setOpenComposerByBucket((previous) => ({ ...previous, [bucketId]: false }));
  };

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

  const openBucketComposer = (bucketId: string) => {
    setOpenComposerByBucket((previous) => ({ ...previous, [bucketId]: true }));
  };

  const handleAddCard = (destination: string) => {
    const text = draftByBucket[destination] ?? "";
    const added = addVocabCard(text, undefined, destination);
    if (!added) {
      return;
    }

    resetBucketComposer(destination);
  };

  const startEditCard = (card: VocabCard) => {
    setEditingCardId(card.id);
    setEditingCardText(card.text);
  };

  const saveCardEdit = () => {
    if (!editingCardId) {
      return;
    }

    updateCardText(editingCardId, editingCardText);
    setEditingCardId(null);
    setEditingCardText("");
  };

  const cancelCardEdit = () => {
    setEditingCardId(null);
    setEditingCardText("");
  };

  const startEditColumn = (column: VocabColumn) => {
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

  const openFlashCards = (columnId: string, title: string, cards: VocabCard[]) => {
    if (cards.length === 0) {
      return;
    }

    setFlashCardModal({ columnId, title, cards });
    setFlashCardIndex(0);
    setIsFlashCardAnswerVisible(false);
    setOpenMenuColumnId(null);
  };

  const showPreviousFlashCard = () => {
    setFlashCardIndex((current) => Math.max(current - 1, 0));
    setIsFlashCardAnswerVisible(false);
  };

  const showNextFlashCard = () => {
    if (!flashCardModal) {
      return;
    }

    setFlashCardIndex((current) => Math.min(current + 1, flashCardModal.cards.length - 1));
    setIsFlashCardAnswerVisible(false);
  };

  const updateBucketDraft = (bucketId: string, value: string) => {
    setDraftByBucket((previous) => ({ ...previous, [bucketId]: value }));
  };

  const handleChangeColumnColor = (columnId: string, colorKey: VocabColumnColorKey) => {
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

  const activeFlashCard = flashCardModal?.cards[flashCardIndex] ?? null;
  const activeFlashCardContent = activeFlashCard ? parseFlashCardText(activeFlashCard.text) : null;

  return {
    board,
    hydrated,
    inboxCards,
    draggingCardId,
    draggingColumnId,
    dropIndicator,
    isAddingColumn,
    newColumnTitle,
    draftByBucket,
    openComposerByBucket,
    editingCardId,
    editingCardText,
    editingColumnId,
    editingColumnTitle,
    openMenuColumnId,
    flashCardModal,
    flashCardIndex,
    isFlashCardAnswerVisible,
    activeFlashCard,
    activeFlashCardContent,
    menuRef,
    boardScrollRef,
    setDraggingCardId,
    setEditingCardText,
    setEditingColumnTitle,
    setIsAddingColumn,
    setNewColumnTitle,
    updateBucketDraft,
    openBucketComposer,
    resetBucketComposer,
    handleCreateColumn,
    cancelCreateColumn,
    handleAddCard,
    startEditCard,
    saveCardEdit,
    cancelCardEdit,
    startEditColumn,
    saveColumnEdit,
    cancelColumnEdit,
    toggleColumnMenu,
    openFlashCards,
    showPreviousFlashCard,
    showNextFlashCard,
    setIsFlashCardAnswerVisible,
    setFlashCardModal,
    handleChangeColumnColor,
    handleRemoveColumn,
    handleDropCardToBucket,
    handleColumnDragStart,
    clearColumnDragState,
    handleColumnDragOver,
    handleColumnDrop,
    handleBoardDragOver,
    handleBoardDrop,
    removeCard,
  };
}
