import { CheckCircle2 } from "lucide-react";

import type { VocabCard } from "@/components/vocab/VocabBoardProvider";

type EditableVocabCardProps = {
  card: VocabCard;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onDragStart: (cardId: string) => void;
};

export function EditableVocabCard({
  card,
  isEditing,
  editingText,
  onEditingTextChange,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onDragStart,
}: EditableVocabCardProps) {
  return (
    <article
      draggable={!isEditing}
      onDragStart={() => onDragStart(card.id)}
      className="group rounded-[16px] border-2 border-ink-fg bg-surface-white px-3.5 py-3 text-ink-fg brutal-shadow-sm transition workbook-press"
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
              className="min-h-[84px] w-full resize-none rounded-[12px] border-2 border-ink-fg bg-white px-3 py-2 text-[15px] leading-6 tracking-[-0.01em] text-ink-fg outline-none"
            />
          ) : (
            <button type="button" onClick={onEdit} className="block w-full text-left text-[15px] leading-6 tracking-[-0.01em] text-ink-fg">
              {card.text}
            </button>
          )}
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={onRemove}
            title="Mark as complete"
            className="rounded-full border-2 border-ink-fg bg-paper-bg p-0.5 text-ink-fg opacity-0 transition group-hover:opacity-100"
          >
            <CheckCircle2 className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
