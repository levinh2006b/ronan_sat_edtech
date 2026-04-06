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
        className="flex w-full items-center gap-2 rounded-[14px] px-2 py-2 text-left text-[14px] font-medium text-slate-500 transition hover:bg-white/50 hover:text-slate-900"
      >
        <Plus className="h-4 w-4" />
        Add card
      </button>
    );
  }

  const isEmptyVariant = variant === "empty";

  return (
    <div
      className={`border border-slate-200/90 bg-white/90 shadow-[0_14px_34px_rgba(148,163,184,0.12)] ${
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
        className={`w-full resize-none rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] leading-6 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 ${
          isEmptyVariant ? "min-h-[56px]" : "min-h-[86px]"
        }`}
      />
      <div className={`flex items-center gap-3 ${isEmptyVariant ? "mt-3 justify-between" : "mt-2.5"}`}>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-[#0071e3] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
        >
          Add card
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="text-slate-500 transition hover:text-slate-900" aria-label="Close">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
