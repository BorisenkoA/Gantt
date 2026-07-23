"use client";

import { addDays, calendarDaysBetween } from "@/lib/scheduler";

export function TimelineRuler({
  rangeStart,
  rangeEnd,
  dayWidth,
  laneLabelWidth,
}: {
  rangeStart: string;
  rangeEnd: string;
  dayWidth: number;
  laneLabelWidth: number;
}) {
  const totalDays = calendarDaysBetween(rangeStart, rangeEnd);
  const today = new Date().toISOString().slice(0, 10);
  const todayOffset = calendarDaysBetween(rangeStart, today);

  const ticks: { offset: number; label: string; isMonthStart: boolean }[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const dateStr = addDays(rangeStart, i);
    const d = new Date(dateStr + "T00:00:00");
    const isMonthStart = d.getDate() === 1;
    const isWeekTick = d.getDay() === 1; // Monday
    if (isMonthStart || isWeekTick || i === 0) {
      ticks.push({
        offset: i,
        label: isMonthStart
          ? d.toLocaleDateString("uk-UA", { month: "short", day: "numeric" })
          : d.toLocaleDateString("uk-UA", { day: "numeric", month: "numeric" }),
        isMonthStart,
      });
    }
  }

  return (
    <div
      className="sticky top-0 z-20 flex border-b border-grid bg-ink/95 backdrop-blur"
      style={{ paddingLeft: laneLabelWidth }}
    >
      <div
        className="relative h-10 shrink-0"
        style={{ width: totalDays * dayWidth }}
      >
        {ticks.map((t) => (
          <div
            key={t.offset}
            className="absolute top-0 flex h-full flex-col justify-between"
            style={{ left: t.offset * dayWidth }}
          >
            <span
              className={
                "font-mono text-[10px] tracking-wide pl-1 " +
                (t.isMonthStart ? "text-chalk" : "text-steel")
              }
            >
              {t.label}
            </span>
            <span
              className={
                "block w-px " +
                (t.isMonthStart ? "h-3 bg-steel" : "h-1.5 bg-grid")
              }
            />
          </div>
        ))}
        {todayOffset >= 0 && todayOffset <= totalDays && (
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-amber"
            style={{ left: todayOffset * dayWidth }}
          >
            <div className="absolute -top-1 -left-[3px] h-2 w-2 rotate-45 bg-amber" />
          </div>
        )}
      </div>
    </div>
  );
}
