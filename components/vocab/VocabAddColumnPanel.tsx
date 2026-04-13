import { Plus } from "lucide-react";

import { COLUMN_WIDTH } from "@/components/vocab/vocabPageTheme";

type VocabAddColumnPanelProps = {
  isAddingColumn: boolean;
  newColumnTitle: string;
  onNewColumnTitleChange: (value: string) => void;
  onCreateColumn: () => void;
  onCancel: () => void;
  onStart: () => void;
};

export function VocabAddColumnPanel({
  isAddingColumn,
  newColumnTitle,
  onNewColumnTitleChange,
  onCreateColumn,
  onCancel,
  onStart,
}: VocabAddColumnPanelProps) {
  return (
    <div className={`${COLUMN_WIDTH} shrink-0 self-start`}>
      {isAddingColumn ? (
        <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4 brutal-shadow">
          <input
            autoFocus
            value={newColumnTitle}
            onChange={(event) => onNewColumnTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreateColumn();
              }

              if (event.key === "Escape") {
                onCancel();
              }
            }}
            placeholder="New list name"
            className="workbook-input text-[15px]"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onCreateColumn}
              className="inline-flex h-11 items-center justify-center rounded-2xl border-2 border-ink-fg bg-accent-1 px-4 text-[14px] font-bold text-ink-fg brutal-shadow-sm workbook-press"
            >
              Create list
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 text-[14px] font-bold text-ink-fg brutal-shadow-sm workbook-press"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-ink-fg bg-paper-bg px-4 py-3.5 text-left brutal-shadow-sm transition hover:bg-surface-white"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-fg bg-accent-1 text-ink-fg">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-bold tracking-[-0.02em] text-ink-fg">Add another list</span>
        </button>
      )}
    </div>
  );
}
