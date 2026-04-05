"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Layers2, MoreHorizontal, Plus, X } from "lucide-react";

import {
  useVocabBoard,
  type VocabCard,
  type VocabColumn,
  type VocabColumnColorKey,
  VOCAB_COLUMN_COLOR_KEYS,
} from "@/components/vocab/VocabBoardProvider";

const COLUMN_WIDTH = "w-[250px]";

const COLUMN_THEME: Record<VocabColumnColorKey, { shell: string; accent: string }> = {
  sky: {
    shell: "border-sky-100/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-sky-200",
  },
  mint: {
    shell: "border-emerald-100/90 bg-[linear-gradient(180deg,rgba(236,253,245,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-emerald-200",
  },
  lavender: {
    shell: "border-violet-100/90 bg-[linear-gradient(180deg,rgba(245,243,255,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-violet-200",
  },
  peach: {
    shell: "border-rose-100/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-rose-200",
  },
  sand: {
    shell: "border-amber-100/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-amber-200",
  },
};

type DropIndicatorState = {
  columnId: string;
  position: "before" | "after";
};

type FlashCardModalState = {
  columnId: string;
  title: string;
  cards: VocabCard[];
};

export default function VocabPage() {
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

  const inboxCards = useMemo(
    () => board.inboxIds.map((id) => board.cards[id]).filter(Boolean),
    [board.cards, board.inboxIds],
  );

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

  const handleCreateColumn = () => {
    const createdId = createColumn(newColumnTitle);
    if (!createdId) {
      return;
    }

    setIsAddingColumn(false);
    setNewColumnTitle("");
  };

  const handleAddCard = (destination: string) => {
    const text = draftByBucket[destination] ?? "";
    const added = addVocabCard(text, undefined, destination);
    if (!added) {
      return;
    }

    setDraftByBucket((previous) => ({ ...previous, [destination]: "" }));
    setOpenComposerByBucket((previous) => ({ ...previous, [destination]: false }));
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

  const startEditColumn = (column: VocabColumn) => {
    setEditingColumnId(column.id);
    setEditingColumnTitle(column.title);
    setOpenMenuColumnId(null);
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

  const saveColumnEdit = () => {
    if (!editingColumnId) {
      return;
    }

    updateColumnTitle(editingColumnId, editingColumnTitle);
    setEditingColumnId(null);
    setEditingColumnTitle("");
  };

  const handleColumnDragStart = (event: React.DragEvent, columnId: string) => {
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

  const handleColumnDragOver = (event: React.DragEvent, columnId: string) => {
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

  const activeFlashCard = flashCardModal?.cards[flashCardIndex] ?? null;
  const activeFlashCardContent = activeFlashCard ? parseFlashCardText(activeFlashCard.text) : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(232,240,247,0.88)_26%,_rgba(225,233,241,0.96)_100%)] px-4 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1640px]">
        <div className="mb-4 flex items-center justify-between rounded-[24px] border border-white/70 bg-white/66 px-4 py-3 shadow-[0_14px_40px_rgba(148,163,184,0.14)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[22px] font-semibold tracking-[-0.03em] text-slate-950">SAT Vocab Board</div>
              <div className="text-[12px] text-slate-500">Vocabulary collections and boards</div>
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-white/75 bg-white/38 p-3 shadow-[0_18px_50px_rgba(148,163,184,0.14)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-400">Collections</div>
            </div>
            <div className="text-[12px] text-slate-500">{board.columns.length + 1} lists</div>
          </div>

          <div
            ref={boardScrollRef}
            className="flex gap-4 overflow-x-auto pb-2"
            onDragOver={(event) => {
              if (draggingColumnId) {
                dragClientXRef.current = event.clientX;
              }
            }}
          >
            <BoardColumnShell
              accentClass="bg-slate-200"
              shellClass="border-slate-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(248,250,252,0.94)_100%)]"
              title={
                <ColumnHeader
                  icon={<Inbox className="h-4 w-4" />}
                  title="Inbox"
                  subtitle={`${inboxCards.length} cards`}
                  menuButton={
                    <ColumnActionButton
                      onClick={() => openFlashCards("inbox", "Inbox", inboxCards)}
                      disabled={inboxCards.length === 0}
                    />
                  }
                />
              }
              onDrop={() => draggingCardId && moveCard(draggingCardId, "inbox")}
            >
              {!hydrated ? (
                <BoardEmptyState text="Loading..." />
              ) : inboxCards.length === 0 ? (
                <BoardEmptyState text="No words saved yet." />
              ) : (
                inboxCards.map((card) => (
                  <EditableVocabCard
                    key={card.id}
                    card={card}
                    isEditing={editingCardId === card.id}
                    editingText={editingCardText}
                    onEditingTextChange={setEditingCardText}
                    onEdit={() => startEditCard(card)}
                    onSave={saveCardEdit}
                    onCancel={() => {
                      setEditingCardId(null);
                      setEditingCardText("");
                    }}
                    onRemove={() => removeCard(card.id)}
                    onDragStart={setDraggingCardId}
                  />
                ))
              )}
              <AddCardComposer
                isOpen={!!openComposerByBucket.inbox}
                value={draftByBucket.inbox ?? ""}
                onOpen={() => setOpenComposerByBucket((previous) => ({ ...previous, inbox: true }))}
                onClose={() => {
                  setDraftByBucket((previous) => ({ ...previous, inbox: "" }));
                  setOpenComposerByBucket((previous) => ({ ...previous, inbox: false }));
                }}
                onChange={(value) => setDraftByBucket((previous) => ({ ...previous, inbox: value }))}
                onAdd={() => handleAddCard("inbox")}
              />
            </BoardColumnShell>

            {board.columns.map((column) => {
              const theme = COLUMN_THEME[column.colorKey];
              const showBefore = dropIndicator?.columnId === column.id && dropIndicator.position === "before" && draggingColumnId !== column.id;
              const showAfter = dropIndicator?.columnId === column.id && dropIndicator.position === "after" && draggingColumnId !== column.id;
              const columnCards = column.cardIds.map((cardId) => board.cards[cardId]).filter(Boolean);

              return (
                <ColumnStack key={column.id}>
                  {showBefore ? <ColumnDropIndicator /> : null}
                  <BoardColumnShell
                    accentClass={theme.accent}
                    shellClass={theme.shell}
                    isDragging={draggingColumnId === column.id}
                    title={
                      editingColumnId === column.id ? (
                        <div className="rounded-[14px] bg-white/92 p-2">
                          <input
                            autoFocus
                            value={editingColumnTitle}
                            onChange={(event) => setEditingColumnTitle(event.target.value)}
                            onBlur={saveColumnEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveColumnEdit();
                              }
                              if (event.key === "Escape") {
                                setEditingColumnId(null);
                                setEditingColumnTitle("");
                              }
                            }}
                            className="w-full bg-transparent text-[13px] font-semibold uppercase tracking-[0.04em] text-slate-900 outline-none"
                          />
                        </div>
                      ) : (
                        <ColumnHeader
                          title={column.title}
                          menuButton={
                            <div className="relative" ref={openMenuColumnId === column.id ? menuRef : undefined}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenMenuColumnId((current) => (current === column.id ? null : column.id));
                                }}
                                className="rounded-full p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {openMenuColumnId === column.id ? (
                                <div className="absolute right-0 top-8 z-20 w-44 rounded-[16px] border border-slate-200 bg-white/96 p-2 shadow-[0_18px_44px_rgba(148,163,184,0.22)] backdrop-blur-xl">
                                  <button
                                    type="button"
                                    onClick={() => openFlashCards(column.id, column.title, columnCards)}
                                    disabled={columnCards.length === 0}
                                    className="mb-1 flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
                                  >
                                    <Layers2 className="h-4 w-4" />
                                    Flash Card
                                  </button>
                                  <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Column Color
                                  </div>
                                  <div className="flex flex-wrap gap-2 px-2 pb-2">
                                    {VOCAB_COLUMN_COLOR_KEYS.map((colorKey) => (
                                      <button
                                        key={colorKey}
                                        type="button"
                                        onClick={() => {
                                          updateColumnColor(column.id, colorKey);
                                          setOpenMenuColumnId(null);
                                        }}
                                        className={`h-7 w-7 rounded-full border border-white shadow-sm ${COLUMN_THEME[colorKey].accent} ${
                                          colorKey === column.colorKey ? "ring-2 ring-slate-300" : ""
                                        }`}
                                        title={`Change color ${colorKey}`}
                                      />
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      removeColumn(column.id);
                                      setOpenMenuColumnId(null);
                                    }}
                                    className="flex w-full items-center rounded-[12px] px-3 py-2 text-left text-[13px] font-medium text-rose-500 transition hover:bg-rose-50"
                                  >
                                    Delete Column
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          }
                        />
                      )
                    }
                    onDrop={() => draggingCardId && moveCard(draggingCardId, column.id)}
                    headerDraggable
                    onHeaderClick={() => startEditColumn(column)}
                    onHeaderDragStart={(event) => handleColumnDragStart(event, column.id)}
                    onHeaderDragEnd={clearColumnDragState}
                    onHeaderDragOver={(event) => handleColumnDragOver(event, column.id)}
                    onHeaderDrop={() => handleColumnDrop(column.id)}
                  >
                    {column.cardIds.length === 0 ? (
                      openComposerByBucket[column.id] ? (
                        <AddCardComposer
                          isOpen
                          value={draftByBucket[column.id] ?? ""}
                          placeholder={`Add the first card`}
                          variant="empty"
                          onOpen={() => undefined}
                          onClose={() => {
                            setDraftByBucket((previous) => ({ ...previous, [column.id]: "" }));
                            setOpenComposerByBucket((previous) => ({ ...previous, [column.id]: false }));
                          }}
                          onChange={(value) => setDraftByBucket((previous) => ({ ...previous, [column.id]: value }))}
                          onAdd={() => handleAddCard(column.id)}
                        />
                      ) : (
                        <BoardEmptyState
                          text="No cards yet."
                          onClick={() => setOpenComposerByBucket((previous) => ({ ...previous, [column.id]: true }))}
                        />
                      )
                    ) : (
                      columnCards.map((card) => (
                        <EditableVocabCard
                          key={card.id}
                          card={card}
                          isEditing={editingCardId === card.id}
                          editingText={editingCardText}
                          onEditingTextChange={setEditingCardText}
                          onEdit={() => startEditCard(card)}
                          onSave={saveCardEdit}
                          onCancel={() => {
                            setEditingCardId(null);
                            setEditingCardText("");
                          }}
                          onRemove={() => removeCard(card.id)}
                          onDragStart={setDraggingCardId}
                        />
                      ))
                    )}
                    {column.cardIds.length > 0 || !openComposerByBucket[column.id] ? (
                      <AddCardComposer
                        isOpen={!!openComposerByBucket[column.id]}
                        value={draftByBucket[column.id] ?? ""}
                        onOpen={() => setOpenComposerByBucket((previous) => ({ ...previous, [column.id]: true }))}
                        onClose={() => {
                          setDraftByBucket((previous) => ({ ...previous, [column.id]: "" }));
                          setOpenComposerByBucket((previous) => ({ ...previous, [column.id]: false }));
                        }}
                        onChange={(value) => setDraftByBucket((previous) => ({ ...previous, [column.id]: value }))}
                        onAdd={() => handleAddCard(column.id)}
                      />
                    ) : null}
                  </BoardColumnShell>
                  {showAfter ? <ColumnDropIndicator /> : null}
                </ColumnStack>
              );
            })}

            <div className={`${COLUMN_WIDTH} shrink-0 self-start`}>
              {isAddingColumn ? (
                <div className="rounded-[18px] border border-white/70 bg-white/72 p-3 shadow-[0_12px_34px_rgba(148,163,184,0.14)] backdrop-blur-xl">
                  <input
                    autoFocus
                    value={newColumnTitle}
                    onChange={(event) => setNewColumnTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateColumn();
                      }
                      if (event.key === "Escape") {
                        setNewColumnTitle("");
                        setIsAddingColumn(false);
                      }
                    }}
                    placeholder="New list name"
                    className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCreateColumn}
                      className="rounded-full bg-[#0071e3] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
                    >
                      Create list
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewColumnTitle("");
                        setIsAddingColumn(false);
                      }}
                      className="text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(true)}
                  className="flex w-full items-center gap-2 rounded-[18px] border border-dashed border-slate-200 bg-white/52 px-4 py-3.5 text-left shadow-[0_12px_30px_rgba(148,163,184,0.1)] backdrop-blur-xl transition hover:bg-white/76"
                >
                  <Plus className="h-4.5 w-4.5 text-slate-700" />
                  <span className="text-[15px] font-medium tracking-[-0.02em] text-slate-800">Add another list</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {flashCardModal && activeFlashCard && activeFlashCardContent ? (
        <FlashCardOverlay
          title={flashCardModal.title}
          currentIndex={flashCardIndex}
          total={flashCardModal.cards.length}
          vocabulary={activeFlashCardContent.vocabulary}
          meaning={activeFlashCardContent.meaning}
          isAnswerVisible={isFlashCardAnswerVisible}
          onToggleAnswer={() => setIsFlashCardAnswerVisible((current) => !current)}
          onClose={() => setFlashCardModal(null)}
          onPrevious={() => {
            setFlashCardIndex((current) => Math.max(current - 1, 0));
            setIsFlashCardAnswerVisible(false);
          }}
          onNext={() => {
            setFlashCardIndex((current) => Math.min(current + 1, flashCardModal.cards.length - 1));
            setIsFlashCardAnswerVisible(false);
          }}
        />
      ) : null}
    </main>
  );
}

function ColumnStack({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-stretch gap-4 transition-all duration-150">{children}</div>;
}

function BoardColumnShell({
  title,
  children,
  onDrop,
  shellClass,
  accentClass,
  isDragging = false,
  headerDraggable = false,
  onHeaderClick,
  onHeaderDragStart,
  onHeaderDragEnd,
  onHeaderDragOver,
  onHeaderDrop,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  onDrop: () => void;
  shellClass: string;
  accentClass: string;
  isDragging?: boolean;
  headerDraggable?: boolean;
  onHeaderClick?: (() => void) | undefined;
  onHeaderDragStart?: ((event: React.DragEvent) => void) | undefined;
  onHeaderDragEnd?: (() => void) | undefined;
  onHeaderDragOver?: ((event: React.DragEvent) => void) | undefined;
  onHeaderDrop?: (() => void) | undefined;
}) {
  return (
    <section
      data-column-shell
      className={`${COLUMN_WIDTH} flex h-[calc(100vh-10.8rem)] shrink-0 flex-col rounded-[20px] border p-3 shadow-[0_16px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-all duration-150 ${shellClass} ${
        isDragging ? "opacity-35" : ""
      }`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div
        draggable={headerDraggable}
        onClick={onHeaderClick}
        onDragStart={onHeaderDragStart}
        onDragEnd={onHeaderDragEnd}
        onDragOver={onHeaderDragOver}
        onDrop={onHeaderDrop}
        className={`${headerDraggable ? "cursor-grab active:cursor-grabbing" : ""} shrink-0 rounded-[16px]`}
      >
        <div className={`mb-2 h-1.5 w-16 rounded-full ${accentClass}`} />
        <div className="shrink-0">{title}</div>
      </div>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-0.5">{children}</div>
    </section>
  );
}

function ColumnHeader({
  title,
  subtitle,
  icon,
  menuButton,
  hideDefaultMenu,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  menuButton?: React.ReactNode;
  hideDefaultMenu?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-[14px] px-2 py-1.5 text-left transition hover:bg-white/55">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-900">{title}</div>
          {subtitle ? <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div> : null}
        </div>
      </div>
      {menuButton ?? (hideDefaultMenu ? null : <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-400" />)}
    </div>
  );
}

function ColumnActionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="rounded-full p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
      title="Flash Card"
    >
      <Layers2 className="h-4 w-4" />
    </button>
  );
}

function EditableVocabCard({
  card,
  isEditing,
  editingText,
  onEditingTextChange,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onDragStart,
}: {
  card: VocabCard;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onDragStart: (cardId: string) => void;
}) {
  return (
    <article
      draggable={!isEditing}
      onDragStart={() => onDragStart(card.id)}
      className="group rounded-[16px] border border-white/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3.5 py-3 text-slate-800 shadow-[0_10px_24px_rgba(148,163,184,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(148,163,184,0.18)]"
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <textarea
              autoFocus
              value={editingText}
              onChange={(event) => onEditingTextChange(event.target.value)}
              onBlur={onSave}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSave();
                }
                if (event.key === "Escape") {
                  onCancel();
                }
              }}
              className="min-h-[84px] w-full resize-none rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-[15px] leading-6 tracking-[-0.01em] text-slate-900 outline-none focus:border-sky-400"
            />
          ) : (
            <button type="button" onClick={onEdit} className="block w-full text-left text-[15px] leading-6 tracking-[-0.01em] text-slate-800">
              {card.text}
            </button>
          )}
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={onRemove}
            title="Mark as complete"
            className="rounded-full p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-sky-500"
          >
            <CheckCircle2 className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AddCardComposer({
  isOpen,
  value,
  onOpen,
  onClose,
  onChange,
  onAdd,
  placeholder = "Enter new vocab content",
  variant = "default",
}: {
  isOpen: boolean;
  value: string;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
  onAdd: () => void;
  placeholder?: string;
  variant?: "default" | "empty";
}) {
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-[14px] px-2 py-2 text-left text-[14px] font-medium text-slate-500 transition hover:bg-white/50 hover:text-slate-900"
      >
        <Plus className="h-4 w-4" />
        Add card
      </button>
    );
  }

  const isEmptyVariant = variant === "empty";

  return (
    <div
      className={`border border-slate-200/90 bg-white/90 shadow-[0_14px_34px_rgba(148,163,184,0.12)] ${
        isEmptyVariant ? "rounded-[18px] p-3" : "rounded-[16px] p-2.5"
      }`}
    >
      <textarea
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        className={`w-full resize-none rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] leading-6 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 ${
          isEmptyVariant ? "min-h-[112px]" : "min-h-[86px]"
        }`}
      />
      <div className={`flex items-center gap-3 ${isEmptyVariant ? "mt-3 justify-between" : "mt-2.5"}`}>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-[#0071e3] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
        >
          Add card
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="text-slate-500 transition hover:text-slate-900" aria-label="Close">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardEmptyState({
  text,
  hint,
  onClick,
}: {
  text: string;
  hint?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full rounded-[18px] border border-dashed border-slate-200 bg-white/55 px-4 py-5 text-left transition hover:border-sky-200 hover:bg-white/82"
      >
        <div className="text-[14px] leading-6 text-slate-500 transition group-hover:text-slate-700">{text}</div>
        {hint ? (
          <div className="mt-1.5 text-[12px] font-medium text-slate-400 transition group-hover:text-sky-500">{hint}</div>
        ) : null}
      </button>
    );
  }

  return <div className="rounded-[16px] border border-dashed border-slate-200 bg-white/45 px-3.5 py-4 text-[13px] leading-6 text-slate-500">{text}</div>;
}

function ColumnDropIndicator() {
  return (
    <div className="flex w-3 shrink-0 items-stretch justify-center">
      <div className="w-[3px] rounded-full bg-sky-400 shadow-[0_0_0_6px_rgba(56,189,248,0.15)]" />
    </div>
  );
}

function FlashCardOverlay({
  title,
  currentIndex,
  total,
  vocabulary,
  meaning,
  isAnswerVisible,
  onToggleAnswer,
  onClose,
  onPrevious,
  onNext,
}: {
  title: string;
  currentIndex: number;
  total: number;
  vocabulary: string;
  meaning: string;
  isAnswerVisible: boolean;
  onToggleAnswer: () => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(226,232,240,0.96)_45%,rgba(203,213,225,0.96)_100%)] px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
          <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">
            Word {currentIndex + 1} / {total}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.18)] transition hover:bg-white"
          aria-label="Close flash card"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-8 py-6">
        <button
          type="button"
          onClick={onToggleAnswer}
          className="flex min-h-[360px] w-full max-w-4xl items-center justify-center rounded-[36px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(241,245,249,0.96)_100%)] px-8 py-10 text-center shadow-[0_28px_80px_rgba(148,163,184,0.24)]"
        >
          <div className="w-full">
            <div className="mb-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isAnswerVisible ? "Meaning" : "Vocabulary"}
            </div>
            <div className="whitespace-pre-wrap break-words text-[clamp(2rem,4.2vw,4.5rem)] font-semibold tracking-[-0.05em] text-slate-950">
              {isAnswerVisible ? meaning || "No separated meaning." : vocabulary}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-4">
          {currentIndex > 0 ? (
            <button
              type="button"
              onClick={onPrevious}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/88 text-slate-700 shadow-[0_14px_30px_rgba(148,163,184,0.2)] transition hover:bg-white"
              aria-label="Previous flash card"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-14 w-14" aria-hidden="true" />
          )}

          {currentIndex < total - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/88 text-slate-700 shadow-[0_14px_30px_rgba(148,163,184,0.2)] transition hover:bg-white"
              aria-label="Next flash card"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-14 w-14" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}

function parseFlashCardText(text: string) {
  const normalized = text.trim();
  const separatorMatch = normalized.match(/\s*[:：]\s*/);

  if (!separatorMatch || separatorMatch.index === undefined) {
    return {
      vocabulary: normalized,
      meaning: "",
    };
  }

  const separatorStart = separatorMatch.index;
  const separatorEnd = separatorStart + separatorMatch[0].length;

  return {
    vocabulary: normalized.slice(0, separatorStart).trim() || normalized,
    meaning: normalized.slice(separatorEnd).trim(),
  };
}
