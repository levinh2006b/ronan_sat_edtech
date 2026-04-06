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
      return "bg-slate-100 dark:bg-slate-800";
    }

    if (count === 1) {
      return "bg-blue-300 dark:bg-blue-900";
    }

    if (count === 2) {
      return "bg-blue-400 dark:bg-blue-700";
    }

    if (count === 3) {
      return "bg-blue-500 dark:bg-blue-600";
    }

    return "bg-blue-600 dark:bg-blue-500";
  };

  return (
    <div className="flex h-full w-full flex-col justify-end pt-2">
      <div className="flex w-full flex-col items-center pb-1">
        <div className="flex w-full flex-wrap justify-center gap-1 sm:gap-1.5">
          {heatmapData.map((day) => (
            <div key={day.dateKey} className="group relative">
              <div
                className={`h-3 w-3 shrink-0 rounded-sm transition-colors duration-200 hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 sm:h-4 sm:w-4 ${getColorClass(
                  day.count,
                )}`}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-auto -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {day.count} test{day.count !== 1 ? "s" : ""} on{" "}
                {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
