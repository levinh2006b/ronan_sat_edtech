type LibraryPaginationProps = {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function LibraryPagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: LibraryPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page === 1}
        className="workbook-button workbook-button-secondary h-14 min-w-32 disabled:opacity-50"
      >
        Previous
      </button>
      <div className="workbook-sticker h-14 justify-center bg-surface-white px-6 sm:px-7">
        Page {page} of {totalPages}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={page === totalPages}
        className="workbook-button workbook-button-secondary h-14 min-w-32 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
