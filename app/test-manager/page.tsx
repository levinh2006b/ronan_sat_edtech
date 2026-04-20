"use client";

import { useSession } from "@/lib/auth/client";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import Loading from "@/components/Loading";
import { TestManagerBoardProvider } from "@/components/test-manager/TestManagerBoardProvider";
import { TestManagerColumn } from "@/components/test-manager/TestManagerColumn";
import { TestManagerInboxColumn } from "@/components/test-manager/TestManagerInboxColumn";
import { TestManagerPageHeader } from "@/components/test-manager/TestManagerPageHeader";
import { useTestManagerPageController } from "@/components/test-manager/useTestManagerPageController";
import { VocabAddColumnPanel } from "@/components/vocab/VocabAddColumnPanel";

function isTestManagerCard<T>(value: T | undefined | null): value is T {
  return Boolean(value);
}

function TestManagerScreen() {
  const {
    board,
    hydrated,
    inboxCards,
    draggingColumnId,
    dropIndicator,
    isAddingColumn,
    newColumnTitle,
    editingColumnId,
    editingColumnTitle,
    openMenuColumnId,
    menuRef,
    boardScrollRef,
    setDraggingCardId,
    setEditingColumnTitle,
    setIsAddingColumn,
    setNewColumnTitle,
    handleCreateColumn,
    cancelCreateColumn,
    startEditColumn,
    saveColumnEdit,
    cancelColumnEdit,
    toggleColumnMenu,
    handleChangeColumnColor,
    handleRemoveColumn,
    handleDropCardToBucket,
    handleColumnDragStart,
    clearColumnDragState,
    handleColumnDragOver,
    handleColumnDrop,
    handleBoardDragOver,
    handleBoardDrop,
  } = useTestManagerPageController();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-paper-bg bg-dot-pattern px-4 py-4 sm:px-5 lg:h-screen lg:overflow-hidden lg:px-6">
      <InitialTabBootReady when={hydrated} />
      <div className="mx-auto max-w-[1640px] lg:flex lg:h-full lg:flex-col">
        <TestManagerPageHeader />

        <section className="workbook-panel p-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-fg/70">Collections</div>
            </div>
            <div className="workbook-sticker bg-accent-3 text-white">{board.columns.length} lists</div>
          </div>

          <div
            ref={boardScrollRef}
            className="flex gap-4 overflow-x-auto pb-2 lg:min-h-0 lg:flex-1 lg:items-stretch"
            onDragOver={handleBoardDragOver}
            onDrop={handleBoardDrop}
          >
            <TestManagerInboxColumn
              hydrated={hydrated}
              cards={inboxCards}
              onCardDragStart={setDraggingCardId}
              onDropCard={() => handleDropCardToBucket("inbox")}
            />

            {board.columns.map((column) => {
              const columnCards = column.cardIds.map((cardId) => board.cards[cardId]).filter(isTestManagerCard);
              const showBefore =
                dropIndicator?.columnId === column.id &&
                dropIndicator.position === "before" &&
                draggingColumnId !== column.id;
              const showAfter =
                dropIndicator?.columnId === column.id &&
                dropIndicator.position === "after" &&
                draggingColumnId !== column.id;

              return (
                <TestManagerColumn
                  key={column.id}
                  column={column}
                  cards={columnCards}
                  showBefore={showBefore}
                  showAfter={showAfter}
                  isDragging={draggingColumnId === column.id}
                  editingColumnId={editingColumnId}
                  editingColumnTitle={editingColumnTitle}
                  openMenuColumnId={openMenuColumnId}
                  menuRef={menuRef}
                  onCardDragStart={setDraggingCardId}
                  onColumnTitleChange={setEditingColumnTitle}
                  onSaveColumnEdit={saveColumnEdit}
                  onCancelColumnEdit={cancelColumnEdit}
                  onStartColumnEdit={() => startEditColumn(column)}
                  onToggleMenu={toggleColumnMenu}
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
              widthClass="w-[375px]"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function TestManagerPage() {
  const { data: session, status } = useSession();
  const canEditPublicExams = session?.user.permissions.includes("edit_public_exams");

  if (status === "loading") {
    return <Loading />;
  }

  if (!session || !canEditPublicExams) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-bg">
        <InitialTabBootReady />
        <div className="workbook-panel bg-accent-3 p-8 font-bold text-white">
          Unauthorized. Edit Public Exams permission required.
        </div>
      </div>
    );
  }

  return (
    <TestManagerBoardProvider>
      <TestManagerScreen />
    </TestManagerBoardProvider>
  );
}
