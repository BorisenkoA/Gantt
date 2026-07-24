"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScheduledProject } from "@/lib/scheduler";

export function ProjectCard({
  project,
  dayWidth,
  onEdit,
  onResizeCommit,
}: {
  project: ScheduledProject;
  dayWidth: number;
  onEdit: (id: string) => void;
  onResizeCommit: (id: string, newDuration: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const cardRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const isResizingRef = useRef(false);

  const pauseDays = project.pauseDays || 0;
  const pauseWidth = pauseDays * dayWidth;

  const days: { iso: string; isSunday: boolean }[] = [];
  const curr = new Date(project.startDate);
  const end = new Date(project.endDate);

  while (curr <= end) {
    days.push({
      iso: curr.toISOString().split("T")[0],
      isSunday: curr.getDay() === 0,
    });
    curr.setDate(curr.getDate() + 1);
  }

  const initialCardWidth = Math.max(dayWidth, days.length * dayWidth);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizingRef.current ? "none" : transition,
    opacity: isDragging ? 0.3 : 1,
  };

  function handleResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();

    isResizingRef.current = true;
    const startX = e.clientX;
    const initialDays = project.duration;

    const cardEl = cardRef.current;
    const badgeEl = badgeRef.current;

    function onPointerMove(moveEvent: PointerEvent) {
      moveEvent.stopPropagation();
      const deltaX = moveEvent.clientX - startX;

      const dayDelta = Math.floor((deltaX + dayWidth / 2) / dayWidth);
      const nextDays = Math.max(1, initialDays + dayDelta);
      const targetWidth = nextDays * dayWidth;

      if (cardEl) cardEl.style.width = `${targetWidth}px`;
      if (badgeEl) badgeEl.innerText = `${nextDays}д`;
    }

    function onPointerUp(upEvent: PointerEvent) {
      upEvent.stopPropagation();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      (window as any).__recentlyResized = true;
      setTimeout(() => {
        (window as any).__recentlyResized = false;
      }, 250);

      isResizingRef.current = false;
      const deltaX = upEvent.clientX - startX;
      const dayDelta = Math.floor((deltaX + dayWidth / 2) / dayWidth);
      const finalDays = Math.max(1, initialDays + dayDelta);

      if (finalDays !== project.duration) {
        onResizeCommit(project.id, finalDays);
      } else {
        if (cardEl) cardEl.style.width = `${initialCardWidth}px`;
        if (badgeEl) badgeEl.innerText = `${project.duration}д`;
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center shrink-0 group select-none z-10 hover:z-30 my-auto mt-10 p-0 m-0"
    >
      {/* 🏷️ НАЗВА, КВТ ТА КІЛЬКІСТЬ ДНІВ ЗВЕРХУ */}
      <div className="absolute -top-10 left-0 z-20 pointer-events-none max-w-[420px]">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xs px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg border border-white/10 whitespace-nowrap truncate">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <span className="truncate">{project.name}</span>

          {project.powerKw && (
            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20 shrink-0">
              ⚡ {project.powerKw} кВт
            </span>
          )}

          <span className="text-[10px] font-mono font-bold text-white bg-white/10 px-1.5 py-0.2 rounded border border-white/15 shrink-0 ml-0.5">
            <span ref={badgeRef}>{days.length}д</span>
          </span>
        </div>
      </div>

      {/* ОСНОВНА КАРТКА ПРОЄКТУ */}
      <div
        ref={cardRef}
        data-project-card="true"
        onDoubleClick={() => {
          if (!isDragging && !isResizingRef.current) {
            onEdit(project.id);
          }
        }}
        style={{
          width: `${initialCardWidth}px`,
          backgroundColor: project.color,
        }}
        className={`relative flex h-10 items-center justify-between rounded-l-md ${
          pauseDays > 0 ? "rounded-r-none" : "rounded-r-md"
        } text-xs font-medium text-ink shadow-sm transition-colors hover:brightness-105 shrink-0 overflow-hidden cursor-pointer`}
        title="Двічі клікніть, щоб відкрити редагування"
      >
        {/* ФОНОВІ БЛОКИ ДНІВ (ПОЧИНАЮТЬСЯ РІВНО З ПЕРШОГО ПІКСЕЛЯ) */}
        <div className="absolute inset-0 flex pointer-events-none z-0">
          {days.map((d, i) =>
            d.isSunday ? (
              <div
                key={i}
                style={{ width: `${dayWidth}px` }}
                className="h-full bg-slate-950/45 dark:bg-slate-950/45 border-x border-black/20 flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, #000, #000 3px, transparent 3px, transparent 6px)`,
                  }}
                />
                <span className="text-[9px] font-black tracking-tighter text-amber-300 z-10 uppercase">
                  ВИХ
                </span>
              </div>
            ) : (
              <div
                key={i}
                style={{ width: `${dayWidth}px` }}
                className="h-full border-r border-black/5"
              />
            ),
          )}
        </div>

        {/* 🖐️ РУЧКА ДЛЯ ПЕРЕТЯГУВАННЯ (НАКЛАДАТЬСЯ ПОВЕРХ ЗЛІВА) */}
        <div
          {...attributes}
          {...listeners}
          className="drag-handle absolute left-0 top-0 bottom-0 w-5 bg-black/25 hover:bg-black/45 cursor-grab active:cursor-grabbing flex items-center justify-center z-30 transition-colors rounded-l-md"
          title="Затисніть, щоб перетягнути проєкт"
        >
          <div className="flex flex-col gap-0.5 pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-white/90" />
            <div className="w-1 h-1 rounded-full bg-white/90" />
            <div className="w-1 h-1 rounded-full bg-white/90" />
          </div>
        </div>

        {/* ↔ ЗОНА РЕСАЙЗУ СПРАВА */}
        <div
          onPointerDown={handleResizePointerDown}
          className={`resize-handle absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center group/handle ${
            pauseDays > 0 ? "rounded-r-none" : "rounded-r-md"
          } z-30 hover:bg-black/25 active:bg-black/40 transition-colors`}
          title="Тягніть вбік, щоб змінити кількість днів"
        >
          <div className="w-0.5 h-4 rounded-full bg-black/40 group-hover/handle:bg-chalk transition-colors pointer-events-none" />
        </div>
      </div>

      {/* ПАУЗА ПІСЛЯ ПРОЄКТУ */}
      {pauseDays > 0 && (
        <div
          style={{ width: `${pauseWidth}px` }}
          className="relative h-10 flex items-center justify-center border-y border-r border-dashed border-slate-300 dark:border-steel/50 bg-slate-200/60 dark:bg-steel/10 text-[10px] text-slate-700 dark:text-chalk font-mono font-medium rounded-r-md overflow-hidden shrink-0"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.06)_25%,rgba(0,0,0,0.06)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.06)_75%)] dark:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:8px_8px]" />
          <span className="relative z-10 flex items-center gap-1 opacity-95 px-1 truncate font-semibold">
            ⏸ {pauseWidth >= 35 ? `${pauseDays}д` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
