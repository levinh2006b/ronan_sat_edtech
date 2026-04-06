import type { VocabCard } from "@/components/vocab/VocabBoardProvider";

export type DropIndicatorState = {
  columnId: string;
  position: "before" | "after";
};

export type FlashCardModalState = {
  columnId: string;
  title: string;
  cards: VocabCard[];
};
