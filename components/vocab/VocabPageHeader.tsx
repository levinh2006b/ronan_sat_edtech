import { BookMarked } from "lucide-react";

export function VocabPageHeader() {
  return (
    <div className="mb-4 flex items-center justify-between rounded-[24px] border border-white/70 bg-white/66 px-4 py-3 shadow-[0_14px_40px_rgba(148,163,184,0.14)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
          <BookMarked className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[22px] font-semibold tracking-[-0.03em] text-slate-950">SAT Vocab Board</div>
          <div className="text-[12px] text-slate-500">Vocabulary collections and boards</div>
        </div>
      </div>
    </div>
  );
}
