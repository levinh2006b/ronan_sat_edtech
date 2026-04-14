"use client";

import { useMemo } from "react";

import type { ActivityResultLike } from "@/types/activity";

interface ActivityHeatmapProps {
  results: ActivityResultLike[];
}

export default function ActivityHeatmap({ results }: ActivityHeatmapProps) {
  const { heatmapData } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last30Days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - index));
      return date;
    });

    const activityMap = new Map<string, number>();

    results.forEach((result) => {
      const resultDate = new Date(result.createdAt || result.date || result.updatedAt || today.toISOString());
      resultDate.setHours(0, 0, 0, 0);
      const dateKey = resultDate.toISOString().split("T")[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    });

    return {
      heatmapData: last30Days.map((date) => {
        const dateKey = date.toISOString().split("T")[0];
        return {
          date,
          count: activityMap.get(dateKey) || 0,
          dateKey,
        };
      }),
    };
  }, [results]);

  const getColorClass = (count: number) => {
    if (count === 0) {
      return "border-ink-fg/15 bg-surface-white";
    }

    if (count === 1) {
      return "border-ink-fg/20 bg-accent-3/20";
    }

    if (count === 2) {
      return "border-ink-fg/25 bg-accent-3/40";
    }

    if (count === 3) {
      return "border-ink-fg/30 bg-accent-3/70";
    }

    return "border-ink-fg bg-accent-3";
  };

  return (
    <div className="flex h-full w-full justify-center">
      <div className="grid grid-cols-10 gap-2">
        {heatmapData.map((day) => (
          <div key={day.dateKey} className="group relative">
            <div
              className={`h-5 w-5 shrink-0 rounded-md border transition-transform duration-150 group-hover:-translate-y-0.5 ${getColorClass(
                day.count,
              )}`}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 w-max max-w-[12rem] -translate-x-1/2 rounded-xl border-2 border-ink-fg bg-surface-white px-3 py-2 text-center text-xs font-medium text-ink-fg opacity-0 brutal-shadow-sm transition-opacity duration-150 group-hover:opacity-100">
              <div>
                {day.count} test{day.count !== 1 ? "s" : ""}
              </div>
              <div className="text-ink-fg/70">
                {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
