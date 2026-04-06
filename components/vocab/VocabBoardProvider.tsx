"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { API_PATHS } from "@/lib/apiPaths";
import {
  emptyVocabBoard,
  isVocabBoardEmpty,
  normalizeVocabBoard,
  VOCAB_COLUMN_COLOR_KEYS,
  type VocabBoardState,
  type VocabColumnColorKey,
} from "@/lib/vocabBoard";

export {
  VOCAB_COLUMN_COLOR_KEYS,
  type VocabBoardState,
  type VocabCard,
  type VocabColumn,
  type VocabColumnColorKey,
} from "@/lib/vocabBoard";

type VocabBoardContextValue = {
  board: VocabBoardState;
  hydrated: boolean;
  addVocabCard: (text: string, sourceQuestionId?: string, destination?: string) => boolean;
  createColumn: (title: string) => string | null;
  moveCard: (cardId: string, destination: string) => void;
  updateCardText: (cardId: string, text: string) => void;
  removeCard: (cardId: string) => void;
  updateColumnTitle: (columnId: string, title: string) => void;
  updateColumnColor: (columnId: string, colorKey: VocabColumnColorKey) => void;
  removeColumn: (columnId: string) => void;
  reorderColumns: (draggedColumnId: string, targetColumnId: string, position: "before" | "after") => void;
};

const VocabBoardContext = createContext<VocabBoardContextValue | null>(null);

async function persistBoardToServer(nextBoard: VocabBoardState) {
  const response = await fetch(API_PATHS.USER_VOCAB_BOARD, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ board: nextBoard }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save vocab board: ${response.status}`);
  }
}

export function VocabBoardProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const idRef = useRef(0);
  const lastPersistedRef = useRef("");
  const [board, setBoard] = useState<VocabBoardState>(emptyVocabBoard);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = useMemo(() => {
    const userKey = session?.user?.email || session?.user?.id || "guest";
    return `ronan-sat-vocab-board:${userKey}`;
  }, [session?.user?.email, session?.user?.id]);

  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (status === "loading" || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const loadBoard = async () => {
      setHydrated(false);

      if (!isAuthenticated) {
        const localBoard = readBoardFromLocalStorage(storageKey);
        if (!cancelled) {
          setBoard(localBoard);
          lastPersistedRef.current = JSON.stringify(localBoard);
          setHydrated(true);
        }
        return;
      }

      try {
        const response = await fetch(API_PATHS.USER_VOCAB_BOARD, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load vocab board: ${response.status}`);
        }

        const payload = (await response.json()) as { board?: unknown };
        const serverBoard = normalizeVocabBoard(payload.board);
        const localBoard = readBoardFromLocalStorage(storageKey);
        const nextBoard = isVocabBoardEmpty(serverBoard) && !isVocabBoardEmpty(localBoard) ? localBoard : serverBoard;

        if (!cancelled) {
          setBoard(nextBoard);
          lastPersistedRef.current = JSON.stringify(nextBoard);
          setHydrated(true);
        }

        if (nextBoard === localBoard) {
          await persistBoardToServer(nextBoard);
          window.localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error("Failed to hydrate vocab board from server:", error);
        const localBoard = readBoardFromLocalStorage(storageKey);
        if (!cancelled) {
          setBoard(localBoard);
          lastPersistedRef.current = JSON.stringify(localBoard);
          setHydrated(true);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, status, storageKey]);

  useEffect(() => {
    if (!hydrated || status === "loading" || typeof window === "undefined") {
      return;
    }

    const serializedBoard = JSON.stringify(board);
    if (serializedBoard === lastPersistedRef.current) {
      return;
    }

    if (!isAuthenticated) {
      window.localStorage.setItem(storageKey, serializedBoard);
      lastPersistedRef.current = serializedBoard;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistBoardToServer(board)
        .then(() => {
          lastPersistedRef.current = serializedBoard;
        })
        .catch((error) => {
          console.error("Failed to persist vocab board:", error);
        });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [board, hydrated, isAuthenticated, status, storageKey]);

  const value = useMemo<VocabBoardContextValue>(
    () => ({
      board,
      hydrated,
      addVocabCard: (text, sourceQuestionId, destination = "inbox") => {
        const normalizedText = normalizeText(text);
        if (!normalizedText) {
          return false;
        }

        let added = false;

        setBoard((previous) => {
          const duplicateId = findDuplicateCardId(previous, normalizedText);
          if (duplicateId) {
            return moveCardBetweenBuckets(previous, duplicateId, destination);
          }

          const id = createUniqueId("vocab", idRef);
          const nextBoard: VocabBoardState = {
            ...previous,
            cards: {
              ...previous.cards,
              [id]: {
                id,
                text: normalizedText,
                createdAt: new Date().toISOString(),
                sourceQuestionId,
              },
            },
            inboxIds: previous.inboxIds,
            columns: previous.columns,
          };

          added = true;
          return moveCardBetweenBuckets(
            {
              ...nextBoard,
              inboxIds: [...previous.inboxIds, id],
            },
            id,
            destination,
          );
        });

        return added;
      },
      createColumn: (title) => {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
          return null;
        }

        const columnId = createUniqueId("column", idRef);
        setBoard((previous) => ({
          ...previous,
          columns: [
            ...previous.columns,
            {
              id: columnId,
              title: normalizedTitle,
              cardIds: [],
              colorKey: VOCAB_COLUMN_COLOR_KEYS[previous.columns.length % VOCAB_COLUMN_COLOR_KEYS.length],
            },
          ],
        }));
        return columnId;
      },
      moveCard: (cardId, destination) => {
        setBoard((previous) => moveCardBetweenBuckets(previous, cardId, destination));
      },
      updateCardText: (cardId, text) => {
        const normalizedText = normalizeText(text);
        if (!normalizedText) {
          return;
        }

        setBoard((previous) => {
          const card = previous.cards[cardId];
          if (!card) {
            return previous;
          }

          return {
            ...previous,
            cards: {
              ...previous.cards,
              [cardId]: {
                ...card,
                text: normalizedText,
              },
            },
          };
        });
      },
      removeCard: (cardId) => {
        setBoard((previous) => {
          if (!previous.cards[cardId]) {
            return previous;
          }

          const nextCards = { ...previous.cards };
          delete nextCards[cardId];

          return {
            ...previous,
            cards: nextCards,
            inboxIds: previous.inboxIds.filter((id) => id !== cardId),
            columns: previous.columns.map((column) => ({
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId),
            })),
          };
        });
      },
      updateColumnTitle: (columnId, title) => {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
          return;
        }

        setBoard((previous) => ({
          ...previous,
          columns: previous.columns.map((column) =>
            column.id === columnId ? { ...column, title: normalizedTitle } : column,
          ),
        }));
      },
      updateColumnColor: (columnId, colorKey) => {
        setBoard((previous) => ({
          ...previous,
          columns: previous.columns.map((column) =>
            column.id === columnId ? { ...column, colorKey } : column,
          ),
        }));
      },
      removeColumn: (columnId) => {
        setBoard((previous) => {
          const targetColumn = previous.columns.find((column) => column.id === columnId);
          if (!targetColumn) {
            return previous;
          }

          const movedInboxIds = [...previous.inboxIds, ...targetColumn.cardIds.filter((id) => !previous.inboxIds.includes(id))];

          return {
            ...previous,
            inboxIds: movedInboxIds,
            columns: previous.columns.filter((column) => column.id !== columnId),
          };
        });
      },
      reorderColumns: (draggedColumnId, targetColumnId, position) => {
        if (draggedColumnId === targetColumnId) {
          return;
        }

        setBoard((previous) => {
          const draggedIndex = previous.columns.findIndex((column) => column.id === draggedColumnId);
          const targetIndex = previous.columns.findIndex((column) => column.id === targetColumnId);

          if (draggedIndex === -1 || targetIndex === -1) {
            return previous;
          }

          const nextColumns = [...previous.columns];
          const [draggedColumn] = nextColumns.splice(draggedIndex, 1);
          const adjustedTargetIndex = nextColumns.findIndex((column) => column.id === targetColumnId);
          const insertionIndex = position === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;
          nextColumns.splice(insertionIndex, 0, draggedColumn);

          return {
            ...previous,
            columns: nextColumns,
          };
        });
      },
    }),
    [board, hydrated],
  );

  return <VocabBoardContext.Provider value={value}>{children}</VocabBoardContext.Provider>;
}

export function useVocabBoard() {
  const context = useContext(VocabBoardContext);
  if (!context) {
    throw new Error("useVocabBoard must be used within VocabBoardProvider");
  }

  return context;
}

function moveCardBetweenBuckets(board: VocabBoardState, cardId: string, destination: string) {
  if (!board.cards[cardId]) {
    return board;
  }

  const nextBoard: VocabBoardState = {
    ...board,
    inboxIds: board.inboxIds.filter((id) => id !== cardId),
    columns: board.columns.map((column) => ({
      ...column,
      cardIds: column.cardIds.filter((id) => id !== cardId),
    })),
  };

  if (destination === "inbox") {
    return {
      ...nextBoard,
      inboxIds: [...nextBoard.inboxIds, cardId],
    };
  }

  return {
    ...nextBoard,
    columns: nextBoard.columns.map((column) =>
      column.id === destination ? { ...column, cardIds: [...column.cardIds, cardId] } : column,
    ),
  };
}

function findDuplicateCardId(board: VocabBoardState, normalizedText: string) {
  return Object.values(board.cards).find((card) => normalizeText(card.text).toLowerCase() === normalizedText.toLowerCase())?.id;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function createUniqueId(prefix: string, idRef: React.MutableRefObject<number>) {
  idRef.current += 1;
  return `${prefix}-${Date.now()}-${idRef.current}`;
}

function readBoardFromLocalStorage(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? normalizeVocabBoard(JSON.parse(raw)) : emptyVocabBoard;
  } catch {
    return emptyVocabBoard;
  }
}
