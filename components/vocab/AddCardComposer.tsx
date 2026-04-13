import { Plus, X } from "lucide-react";

type AddCardComposerProps = {
  isOpen: boolean;
  value: string;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
  onAdd: () => void;
  placeholder?: string;
  variant?: "default" | "empty";
};

export function AddCardComposer({
  isOpen,
  value,
  onOpen,
  onClose,
  onChange,
  onAdd,
  placeholder = "Enter new vocab content",
  variant = "default",
}: AddCardComposerProps) {
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-[14px] border-2 border-dashed border-ink-fg bg-paper-bg px-3 py-3 text-left text-[14px] font-medium text-ink-fg transition workbook-press"
      >
        <Plus className="h-4 w-4" />
        Add card
      </button>
    );
  }

  const isEmptyVariant = variant === "empty";

  return (
    <div
      className={`border-2 border-ink-fg bg-surface-white brutal-shadow-sm ${
        isEmptyVariant ? "rounded-[18px] p-3" : "rounded-[16px] p-2.5"
      }`}
    >
      <textarea
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        className={`w-full resize-none rounded-[12px] border-2 border-ink-fg bg-white px-3 py-2.5 text-[14px] leading-6 text-ink-fg outline-none transition ${
          isEmptyVariant ? "min-h-[56px]" : "min-h-[86px]"
        }`}
      />
      <div className={`flex items-center gap-3 ${isEmptyVariant ? "mt-3 justify-between" : "mt-2.5"}`}>
        <button
          type="button"
          onClick={onAdd}
          className="workbook-button px-3.5 py-2 text-[13px]"
        >
          Add card
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="text-ink-fg transition" aria-label="Close">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
