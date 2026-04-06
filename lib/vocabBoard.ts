export const VOCAB_COLUMN_COLOR_KEYS = ["sky", "mint", "lavender", "peach", "sand"] as const;

export type VocabColumnColorKey = (typeof VOCAB_COLUMN_COLOR_KEYS)[number];

export type VocabCard = {
  id: string;
  text: string;
  createdAt: string;
  sourceQuestionId?: string;
};

export type VocabColumn = {
  id: string;
  title: string;
  cardIds: string[];
  colorKey: VocabColumnColorKey;
};

export type VocabBoardState = {
  inboxIds: string[];
  columns: VocabColumn[];
  cards: Record<string, VocabCard>;
};

export const emptyVocabBoard: VocabBoardState = {
  inboxIds: [],
  columns: [],
  cards: {},
};

export function normalizeVocabBoard(raw: unknown): VocabBoardState {
  if (!raw || typeof raw !== "object") {
    return emptyVocabBoard;
  }

  const maybeBoard = raw as Partial<VocabBoardState>;
  const cardIdMap = new Map<string, string>();
  const usedCardIds = new Set<string>();
  const cardsEntries = maybeBoard.cards && typeof maybeBoard.cards === "object" ? Object.entries(maybeBoard.cards) : [];
  const normalizedCards: Record<string, VocabCard> = {};

  cardsEntries.forEach(([entryKey, rawCard], index) => {
    const value = rawCard as Partial<VocabCard> | undefined;
    const rawId = isString(value?.id) ? value.id : entryKey;
    if (!isString(rawId) || !isString(value?.text) || !isString(value?.createdAt)) {
      return;
    }

    const nextId = makeStableUniqueId(rawId, usedCardIds, "vocab", index);
    cardIdMap.set(entryKey, nextId);
    cardIdMap.set(rawId, nextId);
    normalizedCards[nextId] = {
      id: nextId,
      text: value.text,
      createdAt: value.createdAt,
      sourceQuestionId: isString(value.sourceQuestionId) ? value.sourceQuestionId : undefined,
    };
  });

  const usedColumnIds = new Set<string>();
  const normalizedColumns = Array.isArray(maybeBoard.columns)
    ? maybeBoard.columns
        .filter((column): column is VocabColumn => Boolean(column && typeof column === "object"))
        .map((column, index) => {
          const rawId = isString(column.id) ? column.id : `column-restored-${index}`;
          const nextId = makeStableUniqueId(rawId, usedColumnIds, "column", index);
          const remappedCardIds = Array.isArray(column.cardIds)
            ? column.cardIds
                .filter(isString)
                .map((cardId) => cardIdMap.get(cardId) ?? null)
                .filter((cardId): cardId is string => typeof cardId === "string" && Boolean(normalizedCards[cardId]))
            : [];

          return {
            id: nextId,
            title: isString(column.title) ? column.title : "Untitled",
            cardIds: Array.from(new Set(remappedCardIds)),
            colorKey: isColorKey(column.colorKey) ? column.colorKey : VOCAB_COLUMN_COLOR_KEYS[index % VOCAB_COLUMN_COLOR_KEYS.length],
          };
        })
    : [];

  const normalizedInboxIds = Array.isArray(maybeBoard.inboxIds)
    ? Array.from(
        new Set(
          maybeBoard.inboxIds
            .filter(isString)
            .map((cardId) => cardIdMap.get(cardId) ?? null)
            .filter((cardId): cardId is string => typeof cardId === "string" && Boolean(normalizedCards[cardId])),
        ),
      )
    : [];

  return {
    inboxIds: normalizedInboxIds,
    columns: normalizedColumns,
    cards: normalizedCards,
  };
}

export function isVocabBoardEmpty(board: VocabBoardState) {
  return board.inboxIds.length === 0 && board.columns.length === 0 && Object.keys(board.cards).length === 0;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isColorKey(value: unknown): value is VocabColumnColorKey {
  return typeof value === "string" && VOCAB_COLUMN_COLOR_KEYS.includes(value as VocabColumnColorKey);
}

function makeStableUniqueId(baseId: string, usedIds: Set<string>, prefix: string, index: number) {
  const candidate = baseId.trim().length > 0 ? baseId : `${prefix}-restored-${index}`;
  if (!usedIds.has(candidate)) {
    usedIds.add(candidate);
    return candidate;
  }

  let suffix = 1;
  while (usedIds.has(`${candidate}-restored-${suffix}`)) {
    suffix += 1;
  }

  const uniqueId = `${candidate}-restored-${suffix}`;
  usedIds.add(uniqueId);
  return uniqueId;
}
