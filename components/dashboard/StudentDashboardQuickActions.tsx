import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BarChart2, BookOpen, LibraryBig, Target, Trophy } from "lucide-react";

type QuickAction = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/full-length",
    title: "Full-Length",
    description: "Run a complete SAT simulation.",
    icon: BookOpen,
    accentClassName: "bg-primary text-ink-fg",
  },
  {
    href: "/sectional",
    title: "Sectional",
    description: "Target one subject or module at a time.",
    icon: Target,
    accentClassName: "bg-accent-2 text-white",
  },
  {
    href: "/review",
    title: "Review",
    description: "Open recent reports and mistakes.",
    icon: BarChart2,
    accentClassName: "bg-surface-white text-ink-fg",
  },
  {
    href: "/vocab",
    title: "Vocab",
    description: "Keep flashcards and word work moving.",
    icon: LibraryBig,
    accentClassName: "bg-accent-1 text-ink-fg",
  },
  {
    href: "/hall-of-fame",
    title: "Hall of Fame",
    description: "See pinned student highlights.",
    icon: Trophy,
    accentClassName: "bg-surface-white text-ink-fg",
  },
];

export default function StudentDashboardQuickActions() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="workbook-sticker bg-primary text-ink-fg">Workbook Shortcuts</div>
          <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">
            Pick your next block.
          </h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <Link key={action.href} href={action.href} className="workbook-panel flex h-full flex-col justify-between p-4 workbook-press">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ink-fg ${action.accentClassName}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-fg">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
