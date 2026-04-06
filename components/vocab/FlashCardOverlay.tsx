import { ChevronLeft, ChevronRight, X } from "lucide-react";

type FlashCardOverlayProps = {
  title: string;
  currentIndex: number;
  total: number;
  vocabulary: string;
  meaning: string;
  isAnswerVisible: boolean;
  onToggleAnswer: () => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function FlashCardOverlay({
  title,
  currentIndex,
  total,
  vocabulary,
  meaning,
  isAnswerVisible,
  onToggleAnswer,
  onClose,
  onPrevious,
  onNext,
}: FlashCardOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(226,232,240,0.96)_45%,rgba(203,213,225,0.96)_100%)] px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
          <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">
            Word {currentIndex + 1} / {total}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.18)] transition hover:bg-white"
          aria-label="Close flash card"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-8 py-6">
        <button
          type="button"
          onClick={onToggleAnswer}
          className="flex min-h-[360px] w-full max-w-4xl items-center justify-center rounded-[36px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(241,245,249,0.96)_100%)] px-8 py-10 text-center shadow-[0_28px_80px_rgba(148,163,184,0.24)]"
        >
          <div className="w-full">
  <div className="mb-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
    {isAnswerVisible ? "Meaning" : "Vocabulary"}
  </div>

  <div
    className={`whitespace-pre-wrap break-words text-slate-950 ${
      isAnswerVisible && !meaning
        ? "text-2xl font-normal text-slate-500 italic" // Khi chưa có meaning: Chữ nhỏ (lg), không đậm (normal), màu nhạt hơn và in nghiêng
        : "text-[clamp(2rem,4.2vw,4.5rem)] font-semibold tracking-[-0.05em]" // Khi đã có meaning: Chữ to, đậm như cũ
    }`}
  >
    {isAnswerVisible
      ? meaning || "Note: You must use a colon ( : ) to separate the word and its meaning \n Example -> Cat : Con mèo."
      : vocabulary}
  </div>
</div>
        </button>

        <div className="flex items-center gap-4">
          {currentIndex > 0 ? (
            <button
              type="button"
              onClick={onPrevious}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/88 text-slate-700 shadow-[0_14px_30px_rgba(148,163,184,0.2)] transition hover:bg-white"
              aria-label="Previous flash card"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-14 w-14" aria-hidden="true" />
          )}

          {currentIndex < total - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/88 text-slate-700 shadow-[0_14px_30px_rgba(148,163,184,0.2)] transition hover:bg-white"
              aria-label="Next flash card"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-14 w-14" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
