"use client";

import type { VocabCard } from "@/components/vocab/VocabBoardProvider";
import { FlashCardOverlay } from "@/components/vocab/FlashCardOverlay";
import { VocabAddColumnPanel } from "@/components/vocab/VocabAddColumnPanel";
import { VocabColumn } from "@/components/vocab/VocabColumn";
import { VocabInboxColumn } from "@/components/vocab/VocabInboxColumn";
import { VocabPageHeader } from "@/components/vocab/VocabPageHeader";
import { useVocabPageController } from "@/components/vocab/useVocabPageController";

function isVocabCard(card: VocabCard | undefined): card is VocabCard {
  return Boolean(card);
}

export default function VocabPage() {
  const {
    board,
    hydrated,
    inboxCards,
    draggingColumnId,
    dropIndicator,
    isAddingColumn,
    newColumnTitle,
    draftByBucket,
    openComposerByBucket,
    editingCardId,
    editingCardText,
    editingColumnId,
    editingColumnTitle,
    openMenuColumnId,
    flashCardModal,
    flashCardIndex,
    isFlashCardAnswerVisible,
    activeFlashCard,
    activeFlashCardContent,
    menuRef,
    boardScrollRef,
    setDraggingCardId,
    setEditingCardText,
    setEditingColumnTitle,
    setIsAddingColumn,
    setNewColumnTitle,
    updateBucketDraft,
    openBucketComposer,
    resetBucketComposer,
    handleCreateColumn,
    cancelCreateColumn,
    handleAddCard,
    startEditCard,
    saveCardEdit,
    cancelCardEdit,
    startEditColumn,
    saveColumnEdit,
    cancelColumnEdit,
    toggleColumnMenu,
    openFlashCards,
    showPreviousFlashCard,
    showNextFlashCard,
    setIsFlashCardAnswerVisible,
    setFlashCardModal,
    handleChangeColumnColor,
    handleRemoveColumn,
    handleDropCardToBucket,
    handleColumnDragStart,
    clearColumnDragState,
    handleColumnDragOver,
    handleColumnDrop,
    handleBoardDragOver,
    handleBoardDrop,
    removeCard,
  } = useVocabPageController();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-paper-bg bg-dot-pattern px-4 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1640px]">
        <VocabPageHeader />

        <section className="workbook-panel p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-fg/70">Collections</div>
            </div>
            <div className="workbook-sticker bg-accent-1 text-ink-fg">{board.columns.length} lists</div>
          </div>

          <div
            ref={boardScrollRef}
            className="flex gap-4 overflow-x-auto pb-2"
            onDragOver={handleBoardDragOver}
            onDrop={handleBoardDrop}
          >
            <VocabInboxColumn
              hydrated={hydrated}
              cards={inboxCards}
              isComposerOpen={!!openComposerByBucket.inbox}
              draftValue={draftByBucket.inbox ?? ""}
              editingCardId={editingCardId}
              editingCardText={editingCardText}
              onDraftChange={(value) => updateBucketDraft("inbox", value)}
              onOpenComposer={() => openBucketComposer("inbox")}
              onCloseComposer={() => resetBucketComposer("inbox")}
              onAddCard={() => handleAddCard("inbox")}
              onEditCard={startEditCard}
              onEditingCardTextChange={setEditingCardText}
              onSaveCardEdit={saveCardEdit}
              onCancelCardEdit={cancelCardEdit}
              onRemoveCard={removeCard}
              onCardDragStart={setDraggingCardId}
              onDropCard={() => handleDropCardToBucket("inbox")}
              onOpenFlashCards={() => openFlashCards("inbox", "Inbox", inboxCards)}
            />

            {board.columns.map((column) => {
              const columnCards = column.cardIds.map((cardId) => board.cards[cardId]).filter(isVocabCard);
              const showBefore =
                dropIndicator?.columnId === column.id &&
                dropIndicator.position === "before" &&
                draggingColumnId !== column.id;
              const showAfter =
                dropIndicator?.columnId === column.id &&
                dropIndicator.position === "after" &&
                draggingColumnId !== column.id;

              return (
                <VocabColumn
                  key={column.id}
                  column={column}
                  cards={columnCards}
                  showBefore={showBefore}
                  showAfter={showAfter}
                  isDragging={draggingColumnId === column.id}
                  isComposerOpen={!!openComposerByBucket[column.id]}
                  draftValue={draftByBucket[column.id] ?? ""}
                  editingCardId={editingCardId}
                  editingCardText={editingCardText}
                  editingColumnId={editingColumnId}
                  editingColumnTitle={editingColumnTitle}
                  openMenuColumnId={openMenuColumnId}
                  menuRef={menuRef}
                  onDraftChange={(value) => updateBucketDraft(column.id, value)}
                  onOpenComposer={() => openBucketComposer(column.id)}
                  onCloseComposer={() => resetBucketComposer(column.id)}
                  onAddCard={() => handleAddCard(column.id)}
                  onEditCard={startEditCard}
                  onEditingCardTextChange={setEditingCardText}
                  onSaveCardEdit={saveCardEdit}
                  onCancelCardEdit={cancelCardEdit}
                  onRemoveCard={removeCard}
                  onCardDragStart={setDraggingCardId}
                  onColumnTitleChange={setEditingColumnTitle}
                  onSaveColumnEdit={saveColumnEdit}
                  onCancelColumnEdit={cancelColumnEdit}
                  onStartColumnEdit={() => startEditColumn(column)}
                  onToggleMenu={toggleColumnMenu}
                  onOpenFlashCards={openFlashCards}
                  onUpdateColumnColor={handleChangeColumnColor}
                  onRemoveColumn={handleRemoveColumn}
                  onDropCard={() => handleDropCardToBucket(column.id)}
                  onHeaderDragStart={handleColumnDragStart}
                  onHeaderDragEnd={clearColumnDragState}
                  onHeaderDragOver={handleColumnDragOver}
                  onHeaderDrop={(event, columnId) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleColumnDrop(columnId);
                  }}
                />
              );
            })}

            <VocabAddColumnPanel
              isAddingColumn={isAddingColumn}
              newColumnTitle={newColumnTitle}
              onNewColumnTitleChange={setNewColumnTitle}
              onCreateColumn={handleCreateColumn}
              onCancel={cancelCreateColumn}
              onStart={() => setIsAddingColumn(true)}
            />
          </div>
        </section>
      </div>

      {flashCardModal && activeFlashCard && activeFlashCardContent ? (
        <FlashCardOverlay
          title={flashCardModal.title}
          currentIndex={flashCardIndex}
          total={flashCardModal.cards.length}
          vocabulary={activeFlashCardContent.vocabulary}
          meaning={activeFlashCardContent.meaning}
          isAnswerVisible={isFlashCardAnswerVisible}
          onToggleAnswer={() => setIsFlashCardAnswerVisible((current) => !current)}
          onClose={() => setFlashCardModal(null)}
          onPrevious={showPreviousFlashCard}
          onNext={showNextFlashCard}
        />
      ) : null}
    </main>
  );
}
