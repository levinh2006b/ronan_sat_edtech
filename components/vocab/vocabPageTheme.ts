import type { VocabColumnColorKey } from "@/components/vocab/VocabBoardProvider";

export const COLUMN_WIDTH = "w-[250px]";

export const COLUMN_THEME: Record<VocabColumnColorKey, { shell: string; accent: string }> = {
  sky: {
    shell: "border-ink-fg bg-surface-white",
    accent: "bg-accent-2 text-white",
  },
  mint: {
    shell: "border-ink-fg bg-surface-white",
    accent: "bg-primary text-ink-fg",
  },
  lavender: {
    shell: "border-ink-fg bg-surface-white",
    accent: "bg-accent-1 text-ink-fg",
  },
  peach: {
    shell: "border-ink-fg bg-surface-white",
    accent: "bg-accent-3 text-white",
  },
  sand: {
    shell: "border-ink-fg bg-surface-white",
    accent: "bg-paper-bg text-ink-fg",
  },
};
