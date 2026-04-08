"use client";

import { Target, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";
import { SectionSkillStat, DomainStat } from "./reviewPage.utils";

function SkillRow({ skill }: { skill: { name: string; wrong: number; correct: number; omitted: number; total: number } }) {
  const missed = skill.wrong + skill.omitted;
  const isClean = missed === 0;
  const textColor = isClean ? "text-emerald-600" : missed >= 3 ? "text-[#C00000]" : "text-amber-600";
  return (
    <div className="flex items-center justify-between py-2 pl-8 pr-1 group">
      <span className="text-sm text-slate-500 group-hover:text-slate-800 transition-colors truncate min-w-0 flex-1 mr-4">
        {skill.name}
      </span>
      {isClean ? (
        <div className="flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">Perfect</span>
        </div>
      ) : (
        <span className={`text-xs font-bold tabular-nums shrink-0 ${textColor}`}>
          -{missed}
        </span>
      )}
    </div>
  );
}

function DomainAccordion({ domainObj }: { domainObj: DomainStat }) {
  const [isOpen, setIsOpen] = useState(false);
  const totalMissed = domainObj.skills.reduce((acc, s) => acc + s.wrong + s.omitted, 0);
  const totalQuestions = domainObj.skills.reduce((acc, s) => acc + s.total, 0);
  const totalCorrect = domainObj.skills.reduce((acc, s) => acc + s.correct, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const dotColor = accuracy >= 80 ? "bg-emerald-400" : accuracy >= 50 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full gap-2.5 py-2.5 text-left group hover:bg-slate-50 -mx-4 px-4 rounded-lg transition-colors"
      >
        {/* chevron */}
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        }
        {/* accuracy dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        {/* domain name */}
        <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate group-hover:text-slate-900 transition-colors">
          {domainObj.domain}
        </span>
        {/* result — same column as skill results */}
        <span className={`text-xs font-bold tabular-nums shrink-0 ${totalMissed === 0 ? "text-emerald-600" : "text-[#C00000]"}`}>
          {totalMissed === 0 ? "✓" : `-${totalMissed}`}
        </span>
      </button>

      {isOpen && (
        <div className="border-l-2 border-slate-100 ml-6 mb-1">
          {domainObj.skills.map((skill) => (
            <SkillRow key={skill.name} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionBlock({ sectionObj }: { sectionObj: SectionSkillStat }) {
  const [isOpen, setIsOpen] = useState(true);
  const totalMissed = sectionObj.domains.reduce(
    (acc, d) => acc + d.skills.reduce((a, s) => a + s.wrong + s.omitted, 0),
    0
  );

  return (
    <div className="mb-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full gap-2 pb-2 mb-1 group"
      >
        {isOpen
          ? <ChevronDown className="w-3 h-3 text-slate-300 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
        }
        <span className="text-sm font-bold text-slate-900 uppercase tracking-widest group-hover:text-slate-600 transition-colors">
          {sectionObj.section}
        </span>
        <div className="flex-1 h-px bg-slate-100 mx-2" />
        {totalMissed > 0 ? (
        <span className="text-xs font-semibold text-[#C00000] tabular-nums">{totalMissed} missed</span>        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        )}
      </button>

      {isOpen && (
        <div>
          {sectionObj.domains.map((domainObj) => (
            <DomainAccordion key={domainObj.domain} domainObj={domainObj} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SkillPerformanceCard({ data }: { data: SectionSkillStat[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="rounded-lg bg-rose-100 p-1.5">
          <Target className="h-4 w-4 text-rose-600" />
        </div>
        <h2 className="text-base font-bold text-rose-700">Skill Analysis</h2>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {data.map((sectionObj) => (
          <SectionBlock key={sectionObj.section} sectionObj={sectionObj} />
        ))}
      </div>
    </div>
  );
}
