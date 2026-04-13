import type { DragEvent, RefObject } from "react";
import { MoreHorizontal } from "lucide-react";

import {
  FIX_COLUMN_COLOR_KEYS,
  type FixCard,
  type FixColumn as FixColumnType,
  type FixColumnColorKey,
} from "@/components/fix/FixBoardProvider";
import { FixCardTile } from "@/components/fix/FixCardTile";
import {
  BoardColumnShell,
  BoardEmptyState,
  ColumnDropIndicator,
  ColumnHeader,
  ColumnStack,
} from "@/components/vocab/VocabBoardPrimitives";
import { COLUMN_THEME } from "@/components/vocab/vocabPageTheme";

type FixColumnProps = {
  column: FixColumnType;
  cards: FixCard[];
  showBefore: boolean;
  showAfter: boolean;
  isDragging: boolean;
  editingColumnId: string | null;
  editingColumnTitle: string;
  openMenuColumnId: string | null;
  menuRef: RefObject<HTMLDivElement | null>;
  onCardDragStart: (cardId: string) => void;
  onColumnTitleChange: (value: string) => void;
  onSaveColumnEdit: () => void;
  onCancelColumnEdit: () => void;
  onStartColumnEdit: () => void;
  onToggleMenu: (columnId: string) => void;
  onUpdateColumnColor: (columnId: string, colorKey: FixColumnColorKey) => void;
  onRemoveColumn: (columnId: string) => void;
  onDropCard: () => void;
  onHeaderDragStart: (event: DragEvent, columnId: string) => void;
  onHeaderDragEnd: () => void;
  onHeaderDragOver: (event: DragEvent, columnId: string) => void;
  onHeaderDrop: (event: DragEvent, columnId: string) => void;
  onResolveCard: (cardId: string) => void;
};

export function FixColumn({
  column,
  cards,
  showBefore,
  showAfter,
  isDragging,
  editingColumnId,
  editingColumnTitle,
  openMenuColumnId,
  menuRef,
  onCardDragStart,
  onColumnTitleChange,
  onSaveColumnEdit,
  onCancelColumnEdit,
  onStartColumnEdit,
  onToggleMenu,
  onUpdateColumnColor,
  onRemoveColumn,
  onDropCard,
  onHeaderDragStart,
  onHeaderDragEnd,
  onHeaderDragOver,
  onHeaderDrop,
  onResolveCard,
}: FixColumnProps) {
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
            <div className="rounded-[14px] border-2 border-ink-fg bg-surface-white p-2 brutal-shadow-sm">
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
                className="w-full bg-transparent text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-fg outline-none"
              />
            </div>
          ) : (
            <ColumnHeader
              title={column.title}
              subtitle={`${cards.length} items`}
              menuButton={
                <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleMenu(column.id);
                    }}
                    className="rounded-full border-2 border-ink-fg bg-surface-white p-1 text-ink-fg transition workbook-press"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {isMenuOpen ? (
                    <div className="absolute right-0 top-10 z-20 w-44 rounded-[16px] border-2 border-ink-fg bg-surface-white p-2 brutal-shadow">
                      <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-fg/70">
                        Column Color
                      </div>
                      <div className="flex flex-wrap gap-2 px-2 pb-2">
                        {FIX_COLUMN_COLOR_KEYS.map((colorKey) => (
                          <button
                            key={colorKey}
                            type="button"
                            onClick={() => onUpdateColumnColor(column.id, colorKey)}
                            className={`h-7 w-7 rounded-full border-2 border-ink-fg ${COLUMN_THEME[colorKey].accent} ${
                              colorKey === column.colorKey ? "ring-2 ring-ink-fg/35" : ""
                            }`}
                            title={`Change color ${colorKey}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveColumn(column.id)}
                        className="flex w-full items-center rounded-[12px] border-2 border-transparent px-3 py-2 text-left text-[13px] font-medium text-accent-3 transition hover:border-ink-fg hover:bg-paper-bg"
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
        {cards.length === 0 ? (
          <BoardEmptyState text="Drop grouped reports here." />
        ) : (
          cards.map((card) => (
            <FixCardTile key={card.id} card={card} draggable onDragStart={onCardDragStart} onResolve={() => onResolveCard(card.id)} />
          ))
        )}
      </BoardColumnShell>
      {showAfter ? <ColumnDropIndicator /> : null}
    </ColumnStack>
  );
}
