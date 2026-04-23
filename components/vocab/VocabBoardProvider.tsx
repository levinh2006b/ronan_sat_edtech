"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth/client";
import { API_PATHS } from "@/lib/apiPaths";
import { parseDraftToCardFields } from "@/components/vocab/flashCardUtils";
import {
  emptyVocabBoard,
  isVocabBoardEmpty,
  normalizeVocabBoard,
  DEFAULT_VOCAB_COLUMN_COLOR_KEYS,
  MAX_VOCAB_DEFINITION_LENGTH,
  type VocabBoardState,
  type VocabColumnColorKey,
} from "@/lib/vocabBoard";

export {             // Re-export để các hàm sau mà cần những hàm dưới có thể import từ đúng 1 nơi duy nhất
  VOCAB_COLUMN_COLOR_KEYS,
  type VocabBoardState,
  type VocabCard,
  type VocabColumn,
  type VocabColumnColorKey,
} from "@/lib/vocabBoard";

type VocabBoardContextValue = {
  board: VocabBoardState;
  hydrated: boolean;
  addVocabCard: (text: string, sourceQuestionId?: string, destination?: string) => string | null;
  createColumn: (title: string) => string | null;
  moveCard: (cardId: string, destination: string) => void;
  updateCard: (cardId: string, nextCard: { term: string; definition: string; audioUrl?: string }) => void;
  removeCard: (cardId: string) => void;
  updateColumnTitle: (columnId: string, title: string) => void;
  updateColumnColor: (columnId: string, colorKey: VocabColumnColorKey) => void;
  removeColumn: (columnId: string) => void;
  reorderColumns: (draggedColumnId: string, targetColumnId: string, position: "before" | "after") => void;
};

// React Context: Truyền dữ liệu qua loa phát thanh để bất kỳ đâu cũng access được thay vì phải truyền thủ công qua từng thành phần nhỏ
const VocabBoardContext = createContext<VocabBoardContextValue | null>(null);

function isResponseStatusError(error: unknown, status: number) {
  return error instanceof Error && error.message === `Request failed with status ${status}`;
}

function createResponseStatusError(status: number) {
  return new Error(`Request failed with status ${status}`);
}

async function wait(ms: number) {     // Nhận vào 50 ms
  await new Promise((resolve) => window.setTimeout(resolve, ms));    // đếm ngược hết 50 ms mới cho chạy tiếp
}

async function persistBoardToServer(nextBoard: VocabBoardState) {  // nextBoard là bảng vocab mới nhất
  const response = await fetch(API_PATHS.USER_VOCAB_BOARD, {       // fetch để kết nối với máy chủ
    method: "PUT",                         // Thay thế toàn bộ dữ liệu cũ 
    credentials: "same-origin",            // Chỉ gửi các thông tin đi nếu Server đúng là của web này, không thì k gửi để bảo mật không tin
    headers: {  
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ board: nextBoard }), // stringify nextBoard rồi mới gửi qua đường truyền mạng
  });

  if (!response.ok) {       // Máy chủ kết nối k thành công => Throw lỗi
    throw createResponseStatusError(response.status);
  }
}

async function loadBoardFromServer() {
  const response = await fetch(API_PATHS.USER_VOCAB_BOARD, {    // Lấy data về bảng vocab
    method: "GET",
    cache: "no-store",                // Tuyệt đối k lấy data cũ, phải lấy mới về
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw createResponseStatusError(response.status);
  }

  const payload = (await response.json()) as { board?: unknown };
  return normalizeVocabBoard(payload.board);
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
        let serverBoard: VocabBoardState | null = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            serverBoard = await loadBoardFromServer();
            break;
          } catch (error) {
            if (!isResponseStatusError(error, 401) || attempt === 2) {
              throw error;
            }

            await wait(250 * (attempt + 1));
          }
        }

        if (!serverBoard) {
          throw createResponseStatusError(401);
        }

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
        const localBoard = readBoardFromLocalStorage(storageKey);

        if (!isResponseStatusError(error, 401)) {
          console.error("Failed to hydrate vocab board from server:", error);
        }

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
          window.localStorage.removeItem(storageKey);
        })
        .catch((error) => {
          if (isResponseStatusError(error, 401)) {
            window.localStorage.setItem(storageKey, serializedBoard);
            return;
          }

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
        const parsedDraft = parseDraftToCardFields(text);
        const normalizedTerm = normalizeText(parsedDraft.term);
        const normalizedDefinition = normalizeDefinition(parsedDraft.definition);
        if (!normalizedTerm) {
          return null;
        }

        let addedCardId: string | null = null;

        setBoard((previous) => {
          const duplicateId = findDuplicateCardId(previous, normalizedTerm);
          if (duplicateId) {
            addedCardId = duplicateId;
            const duplicateCard = previous.cards[duplicateId];
            const nextBoard =
              duplicateCard && !duplicateCard.definition && normalizedDefinition
                ? {
                    ...previous,
                    cards: {
                      ...previous.cards,
                      [duplicateId]: {
                        ...duplicateCard,
                        definition: normalizedDefinition,
                        audioUrl: duplicateCard.audioUrl,
                      },
                    },
                  }
                : previous;

            return moveCardBetweenBuckets(nextBoard, duplicateId, destination);
          }

          const id = createUniqueId("vocab", idRef);
          addedCardId = id;
          const nextBoard: VocabBoardState = {
            ...previous,
            cards: {
              ...previous.cards,
                [id]: {
                  id,
                  term: normalizedTerm,
                  definition: normalizedDefinition,
                  audioUrl: undefined,
                  createdAt: new Date().toISOString(),
                  sourceQuestionId,
                },
            },
            inboxIds: previous.inboxIds,
            columns: previous.columns,
          };

          return moveCardBetweenBuckets(
            {
              ...nextBoard,
              inboxIds: [...previous.inboxIds, id],
            },
            id,
            destination,
          );
        });

        return addedCardId;
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
              colorKey: DEFAULT_VOCAB_COLUMN_COLOR_KEYS[previous.columns.length % DEFAULT_VOCAB_COLUMN_COLOR_KEYS.length],
            },
          ],
        }));
        return columnId;
      },
      moveCard: (cardId, destination) => {
        setBoard((previous) => moveCardBetweenBuckets(previous, cardId, destination));
      },
      updateCard: (cardId, nextCard) => {
        const normalizedTerm = normalizeText(nextCard.term);
        const normalizedDefinition = normalizeDefinition(nextCard.definition);
        const normalizedAudioUrl = nextCard.audioUrl?.trim() || undefined;
        if (!normalizedTerm) {
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
                  term: normalizedTerm,
                  definition: normalizedDefinition,
                  audioUrl: normalizedAudioUrl ?? card.audioUrl,
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
  return Object.values(board.cards).find((card) => normalizeText(card.term).toLowerCase() === normalizedText.toLowerCase())?.id;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeDefinition(text: string) {
  return normalizeText(text).slice(0, MAX_VOCAB_DEFINITION_LENGTH);
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
