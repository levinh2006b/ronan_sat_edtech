import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";

import { emptyVocabBoard, normalizeVocabBoard, type VocabBoardState } from "@/lib/vocabBoard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type VocabColumnRow = {
  id: string;
  title: string;
  color_key: string;
  sort_order: number;
};

type VocabCardRow = {
  id: string;
  term: string;
  definition: string;
  audio_url: string | null;
  source_question_id: string | null;
  created_at: string;
};

type VocabPositionRow = {
  card_id: string;
  column_id: string | null;
  is_inbox: boolean;
  position_index: number;
};

async function buildBoard(userId: string) {
  const supabase = createSupabaseAdminClient();
  const [{ data: columns, error: columnsError }, { data: cards, error: cardsError }] = await Promise.all([
    supabase.from("vocab_columns").select("id,title,color_key,sort_order").eq("user_id", userId).order("sort_order", { ascending: true }),
    supabase.from("vocab_cards").select("id,term,definition,audio_url,source_question_id,created_at").eq("user_id", userId),
  ]);

  if (columnsError || cardsError) {
    throw columnsError ?? cardsError;
  }

  const cardIds = (cards ?? []).map((card) => card.id);
  const { data: positions, error: positionsError } = cardIds.length
    ? await supabase.from("vocab_card_positions").select("card_id,column_id,is_inbox,position_index").in("card_id", cardIds)
    : { data: [], error: null };

  if (positionsError) {
    throw positionsError;
  }

  const cardMap = Object.fromEntries(
    (cards ?? []).map((card) => [
      card.id,
      {
        id: card.id,
        term: card.term,
        definition: card.definition,
        audioUrl: card.audio_url ?? undefined,
        createdAt: card.created_at,
        sourceQuestionId: card.source_question_id ?? undefined,
      },
    ])
  );

  const positionsByCardId = new Map((positions ?? []).map((position) => [position.card_id, position]));
  const board = {
    inboxIds: (positions ?? [])
      .filter((position) => position.is_inbox)
      .sort((left, right) => left.position_index - right.position_index)
      .map((position) => position.card_id)
      .filter((cardId) => Boolean(cardMap[cardId])),
    columns: (columns ?? []).map((column) => ({
      id: column.id,
      title: column.title,
      colorKey: column.color_key,
      cardIds: (cards ?? [])
        .filter((card) => positionsByCardId.get(card.id)?.column_id === column.id)
        .sort((left, right) => (positionsByCardId.get(left.id)?.position_index ?? 0) - (positionsByCardId.get(right.id)?.position_index ?? 0))
        .map((card) => card.id),
    })),
    cards: cardMap,
  };

  return normalizeVocabBoard(board);
}

async function saveBoardIncrementally(userId: string, board: VocabBoardState) {
  const supabase = createSupabaseAdminClient();
  const [{ data: existingColumns, error: columnsError }, { data: existingCards, error: cardsError }] = await Promise.all([
    supabase.from("vocab_columns").select("id,title,color_key,sort_order").eq("user_id", userId),
    supabase.from("vocab_cards").select("id,term,definition,audio_url,source_question_id,created_at").eq("user_id", userId),
  ]);

  if (columnsError || cardsError) {
    throw columnsError ?? cardsError;
  }

  const existingCardIds = (existingCards ?? []).map((card) => card.id);
  const { data: existingPositions, error: positionsError } = existingCardIds.length
    ? await supabase.from("vocab_card_positions").select("card_id,column_id,is_inbox,position_index").in("card_id", existingCardIds)
    : { data: [], error: null };

  if (positionsError) {
    throw positionsError;
  }

  const columnIdMap = await saveColumns(userId, board, existingColumns ?? []);
  const cardIdMap = await saveCards(userId, board, existingCards ?? []);
  const nextPositions = buildNextPositions(board, cardIdMap, columnIdMap);
  await savePositions(nextPositions, existingPositions ?? []);
  await deleteRemovedRows(userId, cardIdMap, columnIdMap, nextPositions, existingCards ?? [], existingColumns ?? [], existingPositions ?? []);
}

async function saveColumns(userId: string, board: VocabBoardState, existingColumns: VocabColumnRow[]) {
  const supabase = createSupabaseAdminClient();
  const existingById = new Map(existingColumns.map((column) => [column.id, column]));
  const columnIdMap = new Map<string, string>();

  for (const [sortOrder, column] of board.columns.entries()) {
    const targetId = isUuid(column.id) ? column.id : null;
    const existingColumn = targetId ? existingById.get(targetId) : undefined;

    if (!targetId || !existingColumn) {
      const { data: insertedColumn, error } = await supabase
        .from("vocab_columns")
        .insert({
          ...(targetId ? { id: targetId } : {}),
          user_id: userId,
          title: column.title,
          color_key: column.colorKey,
          sort_order: sortOrder,
        })
        .select("id")
        .single();

      if (error || !insertedColumn) {
        throw error ?? new Error("Failed to save vocab column");
      }

      columnIdMap.set(column.id, insertedColumn.id);
      continue;
    }

    columnIdMap.set(column.id, existingColumn.id);
    if (existingColumn.title === column.title && existingColumn.color_key === column.colorKey && existingColumn.sort_order === sortOrder) {
      continue;
    }

    const { error } = await supabase
      .from("vocab_columns")
      .update({
        title: column.title,
        color_key: column.colorKey,
        sort_order: sortOrder,
      })
      .eq("id", existingColumn.id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  return columnIdMap;
}

async function saveCards(userId: string, board: VocabBoardState, existingCards: VocabCardRow[]) {
  const supabase = createSupabaseAdminClient();
  const existingById = new Map(existingCards.map((card) => [card.id, card]));
  const cardIdMap = new Map<string, string>();

  for (const card of Object.values(board.cards)) {
    const targetId = isUuid(card.id) ? card.id : null;
    const existingCard = targetId ? existingById.get(targetId) : undefined;
    const nextAudioUrl = card.audioUrl ?? null;
    const nextSourceQuestionId = isUuid(card.sourceQuestionId) ? card.sourceQuestionId : null;

    if (!targetId || !existingCard) {
      const { data: insertedCard, error } = await supabase
        .from("vocab_cards")
        .insert({
          ...(targetId ? { id: targetId } : {}),
          user_id: userId,
          source_question_id: nextSourceQuestionId,
          term: card.term,
          definition: card.definition,
          audio_url: nextAudioUrl,
          ...(isValidDateString(card.createdAt) ? { created_at: card.createdAt } : {}),
        })
        .select("id")
        .single();

      if (error || !insertedCard) {
        throw error ?? new Error("Failed to save vocab card");
      }

      cardIdMap.set(card.id, insertedCard.id);
      continue;
    }

    cardIdMap.set(card.id, existingCard.id);
    if (
      existingCard.term === card.term &&
      existingCard.definition === card.definition &&
      existingCard.audio_url === nextAudioUrl &&
      existingCard.source_question_id === nextSourceQuestionId
    ) {
      continue;
    }

    const { error } = await supabase
      .from("vocab_cards")
      .update({
        source_question_id: nextSourceQuestionId,
        term: card.term,
        definition: card.definition,
        audio_url: nextAudioUrl,
      })
      .eq("id", existingCard.id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  return cardIdMap;
}

async function savePositions(nextPositions: Map<string, VocabPositionRow>, existingPositions: VocabPositionRow[]) {
  const supabase = createSupabaseAdminClient();
  const existingByCardId = new Map(existingPositions.map((position) => [position.card_id, position]));

  for (const position of nextPositions.values()) {
    const existingPosition = existingByCardId.get(position.card_id);

    if (!existingPosition) {
      const { error } = await supabase.from("vocab_card_positions").insert(position);
      if (error) {
        throw error;
      }
      continue;
    }

    if (
      existingPosition.column_id === position.column_id &&
      existingPosition.is_inbox === position.is_inbox &&
      existingPosition.position_index === position.position_index
    ) {
      continue;
    }

    const { error } = await supabase
      .from("vocab_card_positions")
      .update({
        column_id: position.column_id,
        is_inbox: position.is_inbox,
        position_index: position.position_index,
      })
      .eq("card_id", position.card_id);

    if (error) {
      throw error;
    }
  }
}

async function deleteRemovedRows(
  userId: string,
  cardIdMap: Map<string, string>,
  columnIdMap: Map<string, string>,
  nextPositions: Map<string, VocabPositionRow>,
  existingCards: VocabCardRow[],
  existingColumns: VocabColumnRow[],
  existingPositions: VocabPositionRow[],
) {
  const supabase = createSupabaseAdminClient();
  const nextCardIds = new Set(cardIdMap.values());
  const nextColumnIds = new Set(columnIdMap.values());
  const nextPositionCardIds = new Set(nextPositions.keys());

  const stalePositionCardIds = existingPositions
    .map((position) => position.card_id)
    .filter((cardId) => !nextPositionCardIds.has(cardId));
  if (stalePositionCardIds.length) {
    const { error } = await supabase.from("vocab_card_positions").delete().in("card_id", stalePositionCardIds);
    if (error) {
      throw error;
    }
  }

  const staleCardIds = existingCards.map((card) => card.id).filter((cardId) => !nextCardIds.has(cardId));
  if (staleCardIds.length) {
    const { error } = await supabase.from("vocab_cards").delete().eq("user_id", userId).in("id", staleCardIds);
    if (error) {
      throw error;
    }
  }

  const staleColumnIds = existingColumns.map((column) => column.id).filter((columnId) => !nextColumnIds.has(columnId));
  if (staleColumnIds.length) {
    const { error } = await supabase.from("vocab_columns").delete().eq("user_id", userId).in("id", staleColumnIds);
    if (error) {
      throw error;
    }
  }
}

function buildNextPositions(
  board: VocabBoardState,
  cardIdMap: Map<string, string>,
  columnIdMap: Map<string, string>,
) {
  const positions = new Map<string, VocabPositionRow>();

  board.inboxIds.forEach((legacyCardId, positionIndex) => {
    const cardId = cardIdMap.get(legacyCardId);
    if (!cardId) {
      return;
    }

    positions.set(cardId, {
      card_id: cardId,
      column_id: null,
      is_inbox: true,
      position_index: positionIndex,
    });
  });

  board.columns.forEach((column) => {
    const columnId = columnIdMap.get(column.id);
    if (!columnId) {
      return;
    }

    column.cardIds.forEach((legacyCardId, positionIndex) => {
      const cardId = cardIdMap.get(legacyCardId);
      if (!cardId) {
        return;
      }

      positions.set(cardId, {
        card_id: cardId,
        column_id: columnId,
        is_inbox: false,
        position_index: positionIndex,
      });
    });
  });

  return positions;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidDateString(value: string) {
  return !Number.isNaN(Date.parse(value));
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await buildBoard(session.user.id);
    return NextResponse.json({ board: normalizeVocabBoard(board ?? emptyVocabBoard) }, { status: 200 });
  } catch (error) {
    console.error("GET /api/user/vocab-board error:", error);
    return NextResponse.json({ error: "Failed to load vocab board" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const board = normalizeVocabBoard(body?.board);
    await saveBoardIncrementally(session.user.id, board);

    return NextResponse.json({ message: "Vocab board saved", board: await buildBoard(session.user.id) }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/user/vocab-board error:", error);
    return NextResponse.json({ error: "Failed to save vocab board" }, { status: 500 });
  }
}
