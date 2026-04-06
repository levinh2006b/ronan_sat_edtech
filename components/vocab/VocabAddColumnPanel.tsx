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
        <div className="rounded-[18px] border border-white/70 bg-white/72 p-3 shadow-[0_12px_34px_rgba(148,163,184,0.14)] backdrop-blur-xl">
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
            className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onCreateColumn}
              className="rounded-full bg-[#0071e3] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
            >
              Create list
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="flex w-full items-center gap-2 rounded-[18px] border border-dashed border-slate-200 bg-white/52 px-4 py-3.5 text-left shadow-[0_12px_30px_rgba(148,163,184,0.1)] backdrop-blur-xl transition hover:bg-white/76"
        >
          <Plus className="h-4.5 w-4.5 text-slate-700" />
          <span className="text-[15px] font-medium tracking-[-0.02em] text-slate-800">Add another list</span>
        </button>
      )}
    </div>
  );
}
