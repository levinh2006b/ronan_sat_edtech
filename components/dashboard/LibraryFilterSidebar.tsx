type LibraryFilterSidebarProps = {
  title: string;
  accentClassName: string;
  options: string[];
  selectedValue: string;
  allLabel: string;
  onSelect: (value: string) => void;
};

export function LibraryFilterSidebar({
  title,
  accentClassName,
  options,
  selectedValue,
  allLabel,
  onSelect,
}: LibraryFilterSidebarProps) {
  return (
    <aside className="workbook-panel sticky top-6 self-start overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
        <div className={`workbook-sticker ${accentClassName}`}>Filter Stack</div>
        <h2 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-ink-fg">{title}</h2>
      </div>

      <div className="flex flex-wrap gap-3 p-4 lg:flex-col">
        {options.map((option) => {
          const active = selectedValue === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={[
                "min-w-[11rem] flex-1 rounded-2xl border-2 border-ink-fg px-4 py-3 text-left brutal-shadow-sm workbook-press lg:w-full lg:min-w-0 lg:flex-none",
                active ? `${accentClassName} font-bold` : "bg-surface-white text-ink-fg",
              ].join(" ")}
            >
              <span className="block text-xs font-bold uppercase tracking-[0.18em]">
                {option === "All" ? allLabel : option}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
