import { Inbox } from "lucide-react";

import { type VocabCard } from "@/components/vocab/VocabBoardProvider";
import { AddCardComposer } from "@/components/vocab/AddCardComposer";
import { EditableVocabCard } from "@/components/vocab/EditableVocabCard";
import { BoardColumnShell, BoardEmptyState, ColumnActionButton, ColumnHeader } from "@/components/vocab/VocabBoardPrimitives";

type VocabInboxColumnProps = {
  hydrated: boolean;
  cards: VocabCard[];
  isComposerOpen: boolean;
  draftValue: string;
  editingCardId: string | null;
  editingCardText: string;
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
  onDropCard: () => void;
  onOpenFlashCards: () => void;
};

export function VocabInboxColumn({
  hydrated,
  cards,
  isComposerOpen,
  draftValue,
  editingCardId,
  editingCardText,
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
  onDropCard,
  onOpenFlashCards,
}: VocabInboxColumnProps) {
  return (
    <BoardColumnShell
      accentClass="bg-slate-200"
      shellClass="border-slate-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(248,250,252,0.94)_100%)]"
      title={
        <ColumnHeader
          icon={<Inbox className="h-4 w-4" />}
          title="Inbox"
          subtitle={`${cards.length} cards`}
          menuButton={<ColumnActionButton onClick={onOpenFlashCards} disabled={cards.length === 0} />}
        />
      }
      onDrop={onDropCard}
    >
      {!hydrated ? (
        <BoardEmptyState text="Loading..." />
      ) : cards.length === 0 ? (
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
          <BoardEmptyState text="No words saved yet." onClick={onOpenComposer} />
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
      {cards.length > 0 || !isComposerOpen ? (
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
  );
}
