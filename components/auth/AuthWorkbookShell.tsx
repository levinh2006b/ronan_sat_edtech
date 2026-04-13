import type { ReactNode } from "react";
import Link from "next/link";

import BrandLogo from "@/components/BrandLogo";

type AuthWorkbookShellProps = {
  badge: string;
  title: ReactNode;
  description: string;
  accentClass: string;
  notes: string[];
  cardTitle: string;
  cardDescription: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function AuthWorkbookShell({
  badge,
  title,
  description,
  accentClass,
  notes,
  cardTitle,
  cardDescription,
  children,
  backHref,
  backLabel,
}: AuthWorkbookShellProps) {
  return (
    <div className="min-h-screen bg-paper-bg bg-grid-pattern px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,32rem)] lg:items-stretch">
        <section className="workbook-panel-muted relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
          <div className={`absolute -right-10 top-8 h-28 w-28 rounded-full border-4 border-ink-fg ${accentClass}`} />
          <div className={`absolute bottom-[-1.5rem] left-[-1.5rem] h-24 w-24 rotate-12 rounded-[1.75rem] border-4 border-ink-fg ${accentClass}`} />

          <div className="relative z-10 max-w-2xl">
            <BrandLogo
              priority
              size={44}
              iconClassName="rounded-full border-2 border-ink-fg bg-surface-white p-1"
              labelClassName="text-2xl font-extrabold"
            />
            <div className={`mt-6 workbook-sticker ${accentClass}`}>{badge}</div>

            <h1 className="mt-6 font-display text-4xl font-black uppercase leading-[0.92] tracking-tight text-ink-fg md:text-6xl">
              {title}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-ink-fg md:text-lg">
              {description}
            </p>

            {notes.length > 0 ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {notes.map((note) => (
                  <div key={note} className="rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-4 brutal-shadow-sm">
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-fg bg-primary text-xs font-black uppercase">
                      SAT
                    </div>
                    <p className="text-sm font-medium leading-6 text-ink-fg">{note}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="workbook-panel relative px-6 py-8 md:px-8 md:py-10">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-ink-fg">Workbook Access</p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">{cardTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-ink-fg">{cardDescription}</p>
          </div>

          {children}

          {backHref && backLabel ? (
            <div className="mt-6 border-t-2 border-ink-fg pt-5 text-sm font-medium text-ink-fg">
              <Link href={backHref} className="underline decoration-2 underline-offset-4">
                {backLabel}
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
