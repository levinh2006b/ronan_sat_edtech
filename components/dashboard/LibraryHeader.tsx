import { LoaderCircle } from "lucide-react";

import type { ReactNode } from "react";

type LibraryHeaderProps = {
  title: string;
  description: string;
  accentClassName: string;
  stickerLabel: string;
  syncing?: boolean;
  children?: ReactNode;
};

export function LibraryHeader({
  title,
  description,
  accentClassName,
  stickerLabel,
  syncing = false,
  children,
}: LibraryHeaderProps) {
  return (
    <div className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className={`workbook-sticker ${accentClassName}`}>{stickerLabel}</div>
              {syncing ? (
                <div className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-fg/70">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Syncing
                </div>
              ) : null}
            </div>
            <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-ink-fg md:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">{description}</p>
          </div>
        </div>
      </div>

      {children ? <div className="bg-paper-bg p-4">{children}</div> : null}
    </div>
  );
}
