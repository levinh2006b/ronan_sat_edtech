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
      className={`${COLUMN_WIDTH} flex h-[calc(100vh-10.8rem)] shrink-0 flex-col rounded-[20px] border p-3 shadow-[0_16px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-all duration-150 ${shellClass} ${
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
        <div className={`mb-2 h-1.5 w-16 rounded-full ${accentClass}`} />
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
    <div className="flex w-full items-center justify-between rounded-[14px] px-2 py-1.5 text-left transition hover:bg-white/55">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-900">{title}</div>
          {subtitle ? <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div> : null}
        </div>
      </div>
      {menuButton ?? (hideDefaultMenu ? null : <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-400" />)}
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
      className="rounded-full p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
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
        className="group w-full rounded-[18px] border border-dashed border-slate-200 bg-white/55 px-4 py-5 text-left transition hover:border-sky-200 hover:bg-white/82"
      >
        <div className="text-[14px] leading-6 text-slate-500 transition group-hover:text-slate-700">{text}</div>
        {hint ? (
          <div className="mt-1.5 text-[12px] font-medium text-slate-400 transition group-hover:text-sky-500">{hint}</div>
        ) : null}
      </button>
    );
  }

  return <div className="rounded-[16px] border border-dashed border-slate-200 bg-white/45 px-3.5 py-4 text-[13px] leading-6 text-slate-500">{text}</div>;
}

export function ColumnDropIndicator() {
  return (
    <div className="flex w-3 shrink-0 items-stretch justify-center">
      <div className="w-[3px] rounded-full bg-sky-400 shadow-[0_0_0_6px_rgba(56,189,248,0.15)]" />
    </div>
  );
}
