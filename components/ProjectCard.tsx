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

      if (cardEl) {
        cardEl.style.width = `${targetWidth}px`;
      }

      if (badgeEl) {
        badgeEl.innerText = `${nextDays}д`;
      }
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
        <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/95 backdrop-blur-xs px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg border border-white/10 whitespace-nowrap truncate">
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
      {/* ⬇️ ДОДАНО КЛАС "no-dnd", ЩОБ БАТЬКІВСЬКИЙ PAN-SCROLL НЕ ПЕРЕХОПЛЮВАВ ПОДІЮ */}
      <div
        ref={cardRef}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          if (isResizingRef.current || (window as any).__recentlyResized) {
            e.stopPropagation();
            return;
          }
          onEdit(project.id);
        }}
        style={{
          width: `${initialCardWidth}px`,
          backgroundColor: project.color,
        }}
        className={`no-dnd relative flex h-10 items-center justify-between rounded-l-md ${
          pauseDays > 0 ? "rounded-r-none" : "rounded-r-md"
        } text-xs font-medium text-ink shadow-sm transition-colors hover:brightness-105 active:cursor-grabbing shrink-0 overflow-hidden touch-none`}
      >
        {/* ФОНОВІ БЛОКИ ДНІВ З ВИДІЛЕННЯМ НЕДІЛІ (ВИХ) */}
        <div className="absolute inset-0 flex pointer-events-none z-0">
          {days.map((d, i) =>
            d.isSunday ? (
              <div
                key={i}
                style={{ width: `${dayWidth}px` }}
                className="h-full bg-slate-950/45 border-x border-black/20 flex flex-col items-center justify-center relative overflow-hidden"
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
            )
          )}
        </div>

        <div className="relative z-10 w-full pointer-events-none" />

        {/* ↔ ЗОНА РЕСАЙЗУ */}
        <div
          onPointerDown={handleResizePointerDown}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className={`no-dnd absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center group/handle ${
            pauseDays > 0 ? "rounded-r-none" : "rounded-r-md"
          } z-30 hover:bg-black/25 active:bg-black/40 transition-colors touch-none`}
          title="Тягніть вбік, щоб змінити кількість днів"
        >
          <div className="w-0.5 h-4 rounded-full bg-black/40 group-hover/handle:bg-chalk transition-colors" />
        </div>
      </div>

      {/* ПАУЗА ПІСЛЯ ПРОЄКТУ */}
      {pauseDays > 0 && (
        <div
          style={{ width: `${pauseWidth}px` }}
          className="relative h-10 flex items-center justify-center border-y border-r border-dashed border-steel/50 bg-steel/10 text-[10px] text-chalk font-mono font-medium rounded-r-md overflow-hidden shrink-0"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:8px_8px]" />
          <span className="relative z-10 flex items-center gap-1 opacity-90 px-1 truncate">
            ⏸ {pauseWidth >= 35 ? `${pauseDays}д` : ""}
          </span>
        </div>
      )}
    </div>
  );
}