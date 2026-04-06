import type { VocabColumnColorKey } from "@/components/vocab/VocabBoardProvider";

export const COLUMN_WIDTH = "w-[250px]";

export const COLUMN_THEME: Record<VocabColumnColorKey, { shell: string; accent: string }> = {
  sky: {
    shell: "border-sky-100/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-sky-200",
  },
  mint: {
    shell: "border-emerald-100/90 bg-[linear-gradient(180deg,rgba(236,253,245,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-emerald-200",
  },
  lavender: {
    shell: "border-violet-100/90 bg-[linear-gradient(180deg,rgba(245,243,255,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-violet-200",
  },
  peach: {
    shell: "border-rose-100/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-rose-200",
  },
  sand: {
    shell: "border-amber-100/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.92)_0%,rgba(255,255,255,0.92)_100%)]",
    accent: "bg-amber-200",
  },
};
