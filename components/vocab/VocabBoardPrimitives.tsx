import type { DragEvent, ReactNode } from "react";
import { Layers2, MoreHorizontal } from "lucide-react";

import { COLUMN_WIDTH } from "@/components/vocab/vocabPageTheme";

export function ColumnStack({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-stretch gap-4 transition-all duration-150">{children}</div>;
}

type BoardColumnShellProps = {
  title: ReactNode;
  children: ReactNode;
  onDrop: () => void;
  shellClass: string;
  accentClass: string;
  widthClass?: string;
  isDragging?: boolean;
  headerDraggable?: boolean;
  onHeaderClick?: (() => void) | undefined;
  onHeaderDragStart?: ((event: DragEvent) => void) | undefined;
  onHeaderDragEnd?: (() => void) | undefined;
  onHeaderDragOver?: ((event: DragEvent) => void) | undefined;
  onHeaderDrop?: ((event: DragEvent) => void) | undefined;
};

export function BoardColumnShell({
  title,
  children,
  onDrop,
  shellClass,
  accentClass,
  widthClass = COLUMN_WIDTH,
  isDragging = false,
  headerDraggable = false,
  onHeaderClick,
  onHeaderDragStart,
  onHeaderDragEnd,
  onHeaderDragOver,
  onHeaderDrop,
}: BoardColumnShellProps) {
  return (
    <section
      data-column-shell
      className={`${widthClass} flex h-[calc(100vh-10.8rem)] shrink-0 flex-col rounded-[20px] border-2 p-3 brutal-shadow transition-all duration-150 ${shellClass} ${
         isDragging ? "opacity-35" : ""
       }`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div
        draggable={headerDraggable}
        onClick={onHeaderClick}
        onDragStart={onHeaderDragStart}
        onDragEnd={onHeaderDragEnd}
        onDragOver={onHeaderDragOver}
        onDrop={onHeaderDrop}
        className={`${headerDraggable ? "cursor-grab active:cursor-grabbing" : ""} shrink-0 rounded-[16px]`}
      >
        <div className={`mb-3 inline-flex rounded-full border-2 border-ink-fg px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] brutal-shadow-sm ${accentClass}`}>
          Column
        </div>
        <div className="shrink-0">{title}</div>
      </div>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-0.5">{children}</div>
    </section>
  );
}

type ColumnHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  menuButton?: ReactNode;
  hideDefaultMenu?: boolean;
};

export function ColumnHeader({ title, subtitle, icon, menuButton, hideDefaultMenu }: ColumnHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between rounded-[14px] border-2 border-ink-fg bg-paper-bg px-3 py-2 text-left">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink-fg bg-surface-white text-ink-fg brutal-shadow-sm">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black uppercase tracking-[0.08em] text-ink-fg">{title}</div>
          {subtitle ? <div className="mt-0.5 text-[11px] text-ink-fg/70">{subtitle}</div> : null}
        </div>
      </div>
      {menuButton ?? (hideDefaultMenu ? null : <MoreHorizontal className="h-4 w-4 shrink-0 text-ink-fg/50" />)}
    </div>
  );
}

export function ColumnActionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="rounded-full border-2 border-ink-fg bg-surface-white p-1 text-ink-fg transition workbook-press disabled:cursor-not-allowed disabled:opacity-45"
      title="Flash Card"
    >
      <Layers2 className="h-4 w-4" />
    </button>
  );
}

type BoardEmptyStateProps = {
  text: string;
  hint?: string;
  onClick?: () => void;
};

export function BoardEmptyState({ text, hint, onClick }: BoardEmptyStateProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full rounded-[18px] border-2 border-dashed border-ink-fg bg-paper-bg px-4 py-5 text-left transition"
      >
        <div className="text-[14px] leading-6 text-ink-fg transition">{text}</div>
        {hint ? (
          <div className="mt-1.5 text-[12px] font-medium text-ink-fg/70 transition">{hint}</div>
        ) : null}
      </button>
    );
  }

  return <div className="rounded-[16px] border-2 border-dashed border-ink-fg bg-paper-bg px-3.5 py-4 text-[13px] leading-6 text-ink-fg">{text}</div>;
}

export function ColumnDropIndicator() {
  return (
    <div className="flex w-3 shrink-0 items-stretch justify-center">
      <div className="w-[3px] rounded-full bg-accent-2" />
    </div>
  );
}
