import { BookMarked } from "lucide-react";

export function VocabPageHeader() {
  return (
    <div className="workbook-panel-muted mb-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border-2 border-ink-fg bg-accent-1 text-ink-fg brutal-shadow-sm">
          <BookMarked className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-[22px] font-black uppercase tracking-tight text-ink-fg">SAT Vocab Board</div>
          <div className="text-[12px] text-ink-fg/70">Vocabulary collections and boards</div>
        </div>
      </div>
    </div>
  );
}
