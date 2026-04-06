import type { DragEvent, RefObject } from "react";
import { Layers2, MoreHorizontal } from "lucide-react";

import {
  VOCAB_COLUMN_COLOR_KEYS,
  type VocabCard,
  type VocabColumn,
  type VocabColumnColorKey,
} from "@/components/vocab/VocabBoardProvider";
import { AddCardComposer } from "@/components/vocab/AddCardComposer";
import { EditableVocabCard } from "@/components/vocab/EditableVocabCard";
import {
  BoardColumnShell,
  BoardEmptyState,
  ColumnDropIndicator,
  ColumnHeader,
  ColumnStack,
} from "@/components/vocab/VocabBoardPrimitives";
import { COLUMN_THEME } from "@/components/vocab/vocabPageTheme";

type VocabColumnProps = {
  column: VocabColumn;
  cards: VocabCard[];
  showBefore: boolean;
  showAfter: boolean;
  isDragging: boolean;
  isComposerOpen: boolean;
  draftValue: string;
  editingCardId: string | null;
  editingCardText: string;
  editingColumnId: string | null;
  editingColumnTitle: string;
  openMenuColumnId: string | null;
  menuRef: RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onAddCard: () => void;
  onEditCard: (card: VocabCard) => void;
  onEditingCardTextChange: (value: string) => void;
  onSaveCardEdit: () => void;
  onCancelCardEdit: () => void;
  onRemoveCard: (cardId: string) => void;
  onCardDragStart: (cardId: string) => void;
  onColumnTitleChange: (value: string) => void;
  onSaveColumnEdit: () => void;
  onCancelColumnEdit: () => void;
  onStartColumnEdit: () => void;
  onToggleMenu: (columnId: string) => void;
  onOpenFlashCards: (columnId: string, title: string, cards: VocabCard[]) => void;
  onUpdateColumnColor: (columnId: string, colorKey: VocabColumnColorKey) => void;
  onRemoveColumn: (columnId: string) => void;
  onDropCard: () => void;
  onHeaderDragStart: (event: DragEvent, columnId: string) => void;
  onHeaderDragEnd: () => void;
  onHeaderDragOver: (event: DragEvent, columnId: string) => void;
  onHeaderDrop: (event: DragEvent, columnId: string) => void;
};

export function VocabColumn({
  column,
  cards,
  showBefore,
  showAfter,
  isDragging,
  isComposerOpen,
  draftValue,
  editingCardId,
  editingCardText,
  editingColumnId,
  editingColumnTitle,
  openMenuColumnId,
  menuRef,
  onDraftChange,
  onOpenComposer,
  onCloseComposer,
  onAddCard,
  onEditCard,
  onEditingCardTextChange,
  onSaveCardEdit,
  onCancelCardEdit,
  onRemoveCard,
  onCardDragStart,
  onColumnTitleChange,
  onSaveColumnEdit,
  onCancelColumnEdit,
  onStartColumnEdit,
  onToggleMenu,
  onOpenFlashCards,
  onUpdateColumnColor,
  onRemoveColumn,
  onDropCard,
  onHeaderDragStart,
  onHeaderDragEnd,
  onHeaderDragOver,
  onHeaderDrop,
}: VocabColumnProps) {
  const theme = COLUMN_THEME[column.colorKey];
  const isEditingColumn = editingColumnId === column.id;
  const isMenuOpen = openMenuColumnId === column.id;

  return (
    <ColumnStack>
      {showBefore ? <ColumnDropIndicator /> : null}
      <BoardColumnShell
        accentClass={theme.accent}
        shellClass={theme.shell}
        isDragging={isDragging}
        title={
          isEditingColumn ? (
            <div className="rounded-[14px] bg-white/92 p-2">
              <input
                autoFocus
                value={editingColumnTitle}
                onChange={(event) => onColumnTitleChange(event.target.value)}
                onBlur={onSaveColumnEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSaveColumnEdit();
                  }

                  if (event.key === "Escape") {
                    onCancelColumnEdit();
                  }
                }}
                className="w-full bg-transparent text-[13px] font-semibold uppercase tracking-[0.04em] text-slate-900 outline-none"
              />
            </div>
          ) : (
            <ColumnHeader
              title={column.title}
              menuButton={
                <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleMenu(column.id);
                    }}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {isMenuOpen ? (
                    <div className="absolute right-0 top-8 z-20 w-44 rounded-[16px] border border-slate-200 bg-white/96 p-2 shadow-[0_18px_44px_rgba(148,163,184,0.22)] backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => onOpenFlashCards(column.id, column.title, cards)}
                        disabled={cards.length === 0}
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
                            onClick={() => onUpdateColumnColor(column.id, colorKey)}
                            className={`h-7 w-7 rounded-full border border-white shadow-sm ${COLUMN_THEME[colorKey].accent} ${
                              colorKey === column.colorKey ? "ring-2 ring-slate-300" : ""
                            }`}
                            title={`Change color ${colorKey}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveColumn(column.id)}
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
        onDrop={onDropCard}
        headerDraggable
        onHeaderClick={onStartColumnEdit}
        onHeaderDragStart={(event) => onHeaderDragStart(event, column.id)}
        onHeaderDragEnd={onHeaderDragEnd}
        onHeaderDragOver={(event) => onHeaderDragOver(event, column.id)}
        onHeaderDrop={(event) => onHeaderDrop(event, column.id)}
      >
        {column.cardIds.length === 0 ? (
          isComposerOpen ? (
            <AddCardComposer
              isOpen
              value={draftValue}
              placeholder="Add the first card"
              variant="empty"
              onOpen={() => undefined}
              onClose={onCloseComposer}
              onChange={onDraftChange}
              onAdd={onAddCard}
            />
          ) : (
            <BoardEmptyState text="No cards yet." onClick={onOpenComposer} />
          )
        ) : (
          cards.map((card) => (
            <EditableVocabCard
              key={card.id}
              card={card}
              isEditing={editingCardId === card.id}
              editingText={editingCardText}
              onEditingTextChange={onEditingCardTextChange}
              onEdit={() => onEditCard(card)}
              onSave={onSaveCardEdit}
              onCancel={onCancelCardEdit}
              onRemove={() => onRemoveCard(card.id)}
              onDragStart={onCardDragStart}
            />
          ))
        )}
        {column.cardIds.length > 0 || !isComposerOpen ? (
          <AddCardComposer
            isOpen={isComposerOpen}
            value={draftValue}
            onOpen={onOpenComposer}
            onClose={onCloseComposer}
            onChange={onDraftChange}
            onAdd={onAddCard}
          />
        ) : null}
      </BoardColumnShell>
      {showAfter ? <ColumnDropIndicator /> : null}
    </ColumnStack>
  );
}
