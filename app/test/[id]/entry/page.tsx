import Link from "next/link";
import { notFound } from "next/navigation";

import BrandLogo from "@/components/BrandLogo";
import { MATH_SECTION, VERBAL_SECTION, normalizeSectionName } from "@/lib/sections";
import { testService } from "@/lib/services/testService";
import { buildTestingRoomHref } from "@/lib/testEntryLinks";

export const dynamic = "force-dynamic";

type SearchParams = {
  mode?: string;
  section?: string;
  module?: string;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
};

type ModuleSpec = {
  key: string;
  section: string;
  module: 1 | 2;
  title: string;
  minutes: number;
  questionCount: number;
};

type TestQuestionCounts = {
  rw_1?: number;
  rw_2?: number;
  math_1?: number;
  math_2?: number;
};

const MODULE_SPECS: ModuleSpec[] = [
  {
    key: "rw_1",
    section: VERBAL_SECTION,
    module: 1,
    title: "Verbal Module 1",
    minutes: 32,
    questionCount: 27,
  },
  {
    key: "rw_2",
    section: VERBAL_SECTION,
    module: 2,
    title: "Verbal Module 2",
    minutes: 32,
    questionCount: 27,
  },
  {
    key: "math_1",
    section: MATH_SECTION,
    module: 1,
    title: "Math Module 1",
    minutes: 35,
    questionCount: 22,
  },
  {
    key: "math_2",
    section: MATH_SECTION,
    module: 2,
    title: "Math Module 2",
    minutes: 35,
    questionCount: 22,
  },
];

function getModuleSpecs(questionCounts: TestQuestionCounts | undefined, sectionName?: string) {
  return MODULE_SPECS.filter((spec) => {
    if (sectionName && spec.section !== sectionName) {
      return false;
    }

    return (questionCounts?.[spec.key as keyof TestQuestionCounts] ?? 0) > 0;
  });
}

function getDifficultyLabel(difficulty: string | undefined) {
  const normalized = (difficulty ?? "").trim();
  return normalized || "Official practice";
}

function formatSectionLabel(sectionName?: string) {
  if (!sectionName) {
    return "Full-length practice";
  }

  return sectionName === VERBAL_SECTION ? "Verbal drill" : `${sectionName} drill`;
}

export default async function TestEntryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const mode = resolvedSearchParams.mode === "sectional" ? "sectional" : "full";
  const sectionName = normalizeSectionName(resolvedSearchParams.section);
  const requestedModule = Number.parseInt(resolvedSearchParams.module ?? "", 10);
  const module = Number.isInteger(requestedModule) && requestedModule > 0 ? requestedModule : null;

  let test;

  try {
    test = await testService.getTestById(id);
  } catch {
    notFound();
  }

  const availableModules = getModuleSpecs(test.questionCounts as TestQuestionCounts | undefined, mode === "sectional" ? sectionName : undefined);

  if (mode === "sectional" && availableModules.length === 0) {
    notFound();
  }

  const selectedModule = module ? availableModules.find((item) => item.module === module) ?? null : null;
  const summaryModules = selectedModule ? [selectedModule] : mode === "sectional" ? availableModules : getModuleSpecs(test.questionCounts as TestQuestionCounts | undefined);
  const totalMinutes = summaryModules.reduce((sum, item) => sum + item.minutes, 0);
  const totalQuestions = summaryModules.reduce((sum, item) => sum + item.questionCount, 0);
  const startHref = buildTestingRoomHref(id, {
    mode,
    sectionName: mode === "sectional" ? sectionName : undefined,
    module: selectedModule?.module ?? undefined,
  });

  return (
    <div className="min-h-screen bg-paper-bg pb-12 text-ink-fg">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <BrandLogo className="items-center" iconClassName="rounded-2xl border-2 border-ink-fg bg-surface-white p-2 brutal-shadow-sm" labelClassName="text-2xl" size={44} priority />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="workbook-sticker bg-primary text-ink-fg">Linked Entry</div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/65">
                {formatSectionLabel(mode === "sectional" ? sectionName : undefined)}
              </div>
            </div>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-black uppercase tracking-tight md:text-5xl">
              Review the exam before you open the testing room.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 md:text-base">
              This link is meant to give students one quick checkpoint before the timer starts. Confirm the format, time, and module you want, then begin when ready.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
            <div className="space-y-6">
              <section className="workbook-panel bg-surface-white p-5">
                <div className="workbook-sticker bg-accent-2 text-white">Exam Sheet</div>
                <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight">{test.title}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatCard label="Minutes" value={String(totalMinutes)} />
                  <StatCard label="Questions" value={String(totalQuestions)} />
                </div>
                <div className="mt-4 rounded-2xl border-2 border-ink-fg bg-paper-bg p-4 text-sm leading-6">
                  <div><span className="font-bold uppercase tracking-[0.12em]">Difficulty:</span> {getDifficultyLabel(test.difficulty)}</div>
                  <div className="mt-2"><span className="font-bold uppercase tracking-[0.12em]">Format:</span> {mode === "sectional" ? "Targeted timed module practice" : "Full SAT simulation across all available modules"}</div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                {summaryModules.map((item) => (
                  <div key={item.key} className="workbook-panel bg-surface-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-fg/70 md:text-[0.64rem]">{item.section}</div>
                        <h3 className="mt-2 font-display text-[1.25rem] font-black uppercase tracking-tight md:text-[1.35rem]">{item.title}</h3>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <StatCard label="Minutes" value={String(item.minutes)} compact />
                      <StatCard label="Questions" value={String(item.questionCount)} compact />
                    </div>
                    {mode === "sectional" && !selectedModule ? (
                      <div className="mt-4">
                        <Link
                          href={buildTestingRoomHref(id, { mode: "sectional", sectionName: item.section, module: item.module })}
                          className="workbook-button w-full justify-center"
                        >
                          Start {item.title}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>
            </div>

            <aside className="workbook-panel flex h-full flex-col bg-surface-white p-5">
              <div className="workbook-sticker bg-accent-1 text-ink-fg">Ready Check</div>
              <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight">Start when you are set.</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6">
                <li>Find a quiet place before you launch the timer.</li>
                <li>Use the module buttons on this page if you opened a sectional link.</li>
                <li>Once the testing room opens, the experience behaves like the live exam room.</li>
              </ul>
              <div className="mt-6 space-y-3">
                {mode === "full" || selectedModule ? (
                  <Link href={startHref} className="workbook-button w-full justify-center">
                    {mode === "full" ? "Start Full Test" : `Start ${selectedModule?.title ?? "Module"}`}
                  </Link>
                ) : null}
                <Link href={mode === "sectional" ? "/sectional" : "/full-length"} className="workbook-button workbook-button-secondary w-full justify-center">
                  Return to Library
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 border-ink-fg bg-surface-white brutal-shadow-sm ${compact ? "p-2.5" : "p-3"}`}>
      <div className={`font-bold uppercase tracking-[0.12em] text-ink-fg/70 ${compact ? "text-[0.5rem]" : "text-[0.54rem]"}`}>{label}</div>
      <div className={`mt-2 font-display font-black leading-none tracking-tight ${compact ? "text-[1.45rem]" : "text-[1.75rem]"}`}>{value}</div>
    </div>
  );
}
