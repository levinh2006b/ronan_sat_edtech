"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Target } from "lucide-react";

import { type DomainStat, type SectionSkillStat } from "./reviewPage.utils";

function SkillRow({ skill }: { skill: { name: string; wrong: number; correct: number; omitted: number; total: number } }) {
  const missed = skill.wrong + skill.omitted;
  const isClean = missed === 0;
  const toneClassName = isClean ? "text-accent-2" : missed >= 3 ? "text-accent-3" : "text-accent-3";

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-3 brutal-shadow-sm">
      <span className="min-w-0 flex-1 text-sm leading-6 text-ink-fg">{skill.name}</span>
      {isClean ? (
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Clean
        </div>
      ) : (
        <span className={`text-xs font-black uppercase tracking-[0.14em] ${toneClassName}`}>-{missed}</span>
      )}
    </div>
  );
}

function DomainAccordion({ domainObj }: { domainObj: DomainStat }) {
  const [isOpen, setIsOpen] = useState(false);
  const totalMissed = domainObj.skills.reduce((acc, skill) => acc + skill.wrong + skill.omitted, 0);
  const totalQuestions = domainObj.skills.reduce((acc, skill) => acc + skill.total, 0);
  const totalCorrect = domainObj.skills.reduce((acc, skill) => acc + skill.correct, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const dotClassName = accuracy >= 80 ? "bg-accent-2" : accuracy >= 50 ? "bg-primary" : "bg-accent-3";

  return (
    <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg p-3">
      <button type="button" onClick={() => setIsOpen((current) => !current)} className="flex w-full items-center gap-3 text-left">
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-fg/70" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-fg/70" />}
        <span className={`h-3 w-3 shrink-0 rounded-full border-2 border-ink-fg ${dotClassName}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-[0.12em] text-ink-fg">{domainObj.domain}</span>
        <span className={`shrink-0 text-xs font-black uppercase tracking-[0.14em] ${totalMissed === 0 ? "text-accent-2" : "text-accent-3"}`}>
          {totalMissed === 0 ? "Clean" : `${totalMissed} missed`}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-3 space-y-3">
          {domainObj.skills.map((skill) => (
            <SkillRow key={skill.name} skill={skill} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SectionBlock({ sectionObj }: { sectionObj: SectionSkillStat }) {
  const [isOpen, setIsOpen] = useState(true);
  const totalMissed = sectionObj.domains.reduce(
    (acc, domain) => acc + domain.skills.reduce((skillAcc, skill) => skillAcc + skill.wrong + skill.omitted, 0),
    0,
  );

  return (
    <div className="space-y-4 rounded-2xl border-2 border-ink-fg bg-surface-white p-4">
      <button type="button" onClick={() => setIsOpen((current) => !current)} className="flex w-full items-center gap-3 text-left">
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-fg/70" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-fg/70" />}
        <span className="text-sm font-black uppercase tracking-[0.2em] text-ink-fg">{sectionObj.section}</span>
        <div className="h-px flex-1 bg-ink-fg/15" />
        {totalMissed > 0 ? (
          <span className="text-xs font-black uppercase tracking-[0.14em] text-accent-3">{totalMissed} missed</span>
        ) : (
          <CheckCircle2 className="h-4 w-4 text-accent-2" />
        )}
      </button>

      {isOpen ? (
        <div className="space-y-3">
          {sectionObj.domains.map((domainObj) => (
            <DomainAccordion key={domainObj.domain} domainObj={domainObj} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SkillPerformanceCard({ data }: { data: SectionSkillStat[] }) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
        <div className="workbook-sticker bg-accent-1 text-ink-fg">
          <Target className="h-3.5 w-3.5" />
          Skill Analysis
        </div>
        <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">
          Miss patterns by section.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
        {data.map((sectionObj) => (
          <SectionBlock key={sectionObj.section} sectionObj={sectionObj} />
        ))}
      </div>
    </div>
  );
}
