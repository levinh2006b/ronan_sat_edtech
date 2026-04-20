"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

type AdminActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  size?: "default" | "wide";
  scrollBody?: boolean;
  bodyClassName?: string;
  children: ReactNode;
};

export default function AdminActionDialog({
  open,
  title,
  description,
  onClose,
  size = "default",
  scrollBody = true,
  bodyClassName,
  children,
}: AdminActionDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-fg/20 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`workbook-modal-card flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden bg-surface-white ${
          size === "wide" ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
          <div>
            <h2 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg">{title}</h2>
            <p className="mt-2 text-sm text-ink-fg/70">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-ink-fg bg-surface-white text-ink-fg brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={joinClassNames(
            "min-h-0 flex-1 p-5 sm:p-6",
            scrollBody ? "overflow-y-auto" : "overflow-hidden",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
