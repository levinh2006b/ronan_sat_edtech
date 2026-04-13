import { Wrench } from "lucide-react";

export function FixPageHeader() {
  return (
    <div className="workbook-panel-muted mb-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border-2 border-ink-fg bg-accent-3 text-white brutal-shadow-sm">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-[22px] font-black uppercase tracking-tight text-ink-fg">Fix Board</div>
          <div className="text-[12px] text-ink-fg/70">Grouped student error reports for admin review</div>
        </div>
      </div>
    </div>
  );
}
