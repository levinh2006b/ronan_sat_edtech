import { Inbox } from "lucide-react";

import { FixCardTile } from "@/components/fix/FixCardTile";
import { type FixCard } from "@/components/fix/FixBoardProvider";
import { BoardColumnShell, BoardEmptyState, ColumnHeader } from "@/components/vocab/VocabBoardPrimitives";

type FixInboxColumnProps = {
  hydrated: boolean;
  cards: FixCard[];
  expandedCardIds: Record<string, boolean>;
  onCardDragStart: (cardId: string) => void;
  onDropCard: () => void;
  onToggleExpanded: (cardId: string) => void;
  onResolve: (cardId: string) => void;
};

export function FixInboxColumn({
  hydrated,
  cards,
  expandedCardIds,
  onCardDragStart,
  onDropCard,
  onToggleExpanded,
  onResolve,
}: FixInboxColumnProps) {
  return (
    <BoardColumnShell
      accentClass="bg-paper-bg text-ink-fg"
      shellClass="border-ink-fg bg-surface-white"
      widthClass="w-[375px]"
      title={<ColumnHeader icon={<Inbox className="h-4 w-4" />} title="Inbox" subtitle={`${cards.length} grouped reports`} hideDefaultMenu />}
      onDrop={onDropCard}
    >
      {!hydrated ? (
        <BoardEmptyState text="Loading..." />
      ) : cards.length === 0 ? (
        <BoardEmptyState text="No active reports." />
      ) : (
        cards.map((card) => (
          <FixCardTile
            key={card.id}
            card={card}
            expanded={!!expandedCardIds[card.id]}
            draggable
            showDetails
            onDragStart={onCardDragStart}
            onToggleExpanded={() => onToggleExpanded(card.id)}
            onResolve={() => onResolve(card.id)}
          />
        ))
      )}
    </BoardColumnShell>
  );
}
