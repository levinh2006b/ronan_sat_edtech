import { Inbox } from "lucide-react";

import { TestManagerCardTile } from "@/components/test-manager/TestManagerCardTile";
import { type TestManagerCard } from "@/lib/testManagerReports";
import { BoardColumnShell, BoardEmptyState, ColumnHeader } from "@/components/vocab/VocabBoardPrimitives";

type TestManagerInboxColumnProps = {
  loading: boolean;
  cards: TestManagerCard[];
  resolvingQuestionId?: string | null;
  deletingQuestionId?: string | null;
  onResolve: (questionId: string) => void;
  onDelete: (questionId: string) => void;
};

export function TestManagerInboxColumn({ loading, cards, resolvingQuestionId, deletingQuestionId, onResolve, onDelete }: TestManagerInboxColumnProps) {
  return (
    <BoardColumnShell
      accentClass="bg-paper-bg text-ink-fg"
      shellClass="border-ink-fg bg-surface-white"
      widthClass="w-full max-w-[920px]"
      eyebrow={null}
      title={<ColumnHeader icon={<Inbox className="h-4 w-4" />} title="Inbox" subtitle={`${cards.length} grouped reports`} hideDefaultMenu />}
      onDrop={() => undefined}
    >
      {loading ? (
        <BoardEmptyState text="Loading..." />
      ) : cards.length === 0 ? (
        <BoardEmptyState text="No active reports." />
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <TestManagerCardTile
              key={card.id}
              card={card}
              detailHref={`/test-manager/questions/${card.id}`}
              resolving={resolvingQuestionId === card.questionId}
              deleting={deletingQuestionId === card.questionId}
              onResolve={onResolve}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </BoardColumnShell>
  );
}
