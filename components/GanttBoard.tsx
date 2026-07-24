"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Users, Edit2, Zap } from "lucide-react";

import { useBoard } from "@/lib/useBoard";
import {
  computeSchedule,
  getDateRange,
  calendarDaysBetween,
} from "@/lib/scheduler";
import { ProjectCard } from "./ProjectCard";
import { ProjectDialog, DialogMode } from "./ProjectDialog";
import { CrewDialog, CrewDialogMode } from "./CrewDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

const DAY_WIDTH = 36; // Ширина одного календарного дня у пікселях

// ---------------------------------------------------------------------------
// ДОРІЖКА БРИГАДИ — droppable-зона на всю ширину таймлайну,
// яка ще й реєструє свій DOM-вузол у мапі рефів для точного розрахунку позиції
function Lane({
  crewId,
  totalWidth,
  registerRef,
  children,
}: {
  crewId: number;
  totalWidth: number;
  registerRef: (crewId: number, el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane-${crewId}` });

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        registerRef(crewId, el);
      }}
      className={`flex items-center h-[96px] relative transition-colors border-b border-slate-300 dark:border-grid ${
        isOver 
          ? "bg-cyan-100 dark:bg-cyan/20 border-cyan-400 dark:border-cyan" 
          : "bg-white dark:bg-transparent"
      }`}
      style={{ minWidth: `${totalWidth}px` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// КАСТОМНА ЛОГІКА ВИЗНАЧЕННЯ "OVER": картки мають ПРІОРИТЕТ над доріжкою
// (потрібно лише щоб визначити ЦІЛЬОВУ БРИГАДУ, індекс рахується окремо)
// ---------------------------------------------------------------------------
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  const cardCollisions = pointerCollisions.filter(
    (c) => !String(c.id).startsWith("lane-")
  );
  if (cardCollisions.length > 0) {
    return cardCollisions;
  }

  const laneCollisions = pointerCollisions.filter((c) =>
    String(c.id).startsWith("lane-")
  );
  if (laneCollisions.length > 0) {
    return laneCollisions;
  }

  return closestCenter(args);
};

export function GanttBoard() {
  const {
    crews,
    projects,
    loading,
    connected,
    updateProjects,
    updateCrews,
    addCrew,
    removeCrew,
    removeProject,
  } = useBoard();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState<DialogMode | null>(null);
  const [crewDialog, setCrewDialog] = useState<CrewDialogMode | null>(null);

  // ⬇️ Мапа реальних DOM-вузлів кожної доріжки, щоб рахувати позицію
  //    незалежно від того, над карткою чи над доріжкою спрацював "over"
  const laneRefs = useRef<Record<number, HTMLDivElement | null>>({});
  function registerLaneRef(crewId: number, el: HTMLDivElement | null) {
    laneRefs.current[crewId] = el;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const scheduled = computeSchedule(crews, projects);
  const dateRange = getDateRange(scheduled);
  const totalTimelineWidth =
    (Array.isArray(dateRange) ? dateRange.length : 0) * DAY_WIDTH;

  // ---------------------------------------------------------------------------
  // Розрахунок індексу вставки за РЕАЛЬНОЮ піксельною позицією курсора
  // відносно лівого краю ЦІЛЬОВОЇ доріжки (а не картки, над якою опинились)
  // ---------------------------------------------------------------------------
  function getProjectPixelWidth(p: { duration: number; pauseDays?: number }) {
    return (p.duration + (p.pauseDays || 0)) * DAY_WIDTH;
  }

  function computeDropIndex(
    targetCrewId: number,
    pointerX: number,
    activeProjectId: string
  ) {
    const laneScheduled = scheduled
      .filter((p) => p.crewId === targetCrewId && p.id !== activeProjectId)
      .sort((a, b) => a.position - b.position);

    if (laneScheduled.length === 0) return 0;

    const firstDayIso = dateRange[0]?.iso;
    const firstOffsetDays = firstDayIso
      ? calendarDaysBetween(firstDayIso, laneScheduled[0].startDate)
      : 0;

    let cumulative = Math.max(0, firstOffsetDays) * DAY_WIDTH;

    for (let i = 0; i < laneScheduled.length; i++) {
      const width = getProjectPixelWidth(laneScheduled[i]);
      if (pointerX < cumulative + width / 2) {
        return i;
      }
      cumulative += width;
    }

    return laneScheduled.length;
  }

  // ---------------------------------------------------------------------------
  // ОБРОБНИКИ ДЛЯ ПРОЄКТІВ
  // ---------------------------------------------------------------------------
  function handleSaveProject(data: {
    id?: string;
    crewId: number;
    name: string;
    duration: number;
    color: string;
    pauseDays: number;
    powerKw?: number;
    startDate?: string;
  }) {
    setProjectDialog(null);

    if (data.id) {
      updateProjects((prev) => {
        const current = prev.find((p) => p.id === data.id);
        if (!current) return prev;

        if (current.crewId === data.crewId) {
          return prev.map((p) =>
            p.id === data.id
              ? {
                  ...p,
                  name: data.name,
                  duration: data.duration,
                  color: data.color,
                  pauseDays: data.pauseDays,
                  powerKw: data.powerKw,
                  startDate: data.startDate,
                }
              : p
          );
        }

        const without = prev.filter((p) => p.id !== data.id);
        const destLen = without.filter((p) => p.crewId === data.crewId).length;
        return [
          ...without,
          {
            ...current,
            name: data.name,
            duration: data.duration,
            color: data.color,
            crewId: data.crewId,
            position: destLen,
            pauseDays: data.pauseDays,
            powerKw: data.powerKw,
            startDate: data.startDate,
          },
        ];
      });
    } else {
      const newProjectId = crypto.randomUUID();
      updateProjects((prev) => {
        if (prev.some((p) => p.id === newProjectId)) return prev;
        const destLen = prev.filter((p) => p.crewId === data.crewId).length;
        return [
          ...prev,
          {
            id: newProjectId,
            crewId: data.crewId,
            name: data.name,
            duration: data.duration,
            color: data.color,
            position: destLen,
            pauseDays: data.pauseDays,
            powerKw: data.powerKw,
            startDate: data.startDate,
          },
        ];
      });
    }
  }

  function handleResizeCommit(id: string, newDuration: number) {
    updateProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, duration: newDuration } : p))
    );
  }

  function handleDeleteProject(id: string) {
    setProjectDialog(null);
    removeProject(id);
  }

  // ---------------------------------------------------------------------------
  // ОБРОБНИКИ ДЛЯ БРИГАД
  // ---------------------------------------------------------------------------
  function handleSaveCrew(data: {
    id?: number;
    name: string;
    anchorDate: string;
  }) {
    setCrewDialog(null);
    if (data.id) {
      updateCrews((prev) =>
        prev.map((c) =>
          c.id === data.id
            ? { ...c, name: data.name, anchorDate: data.anchorDate }
            : c
        )
      );
    } else {
      addCrew(data.name, data.anchorDate);
    }
  }

  function handleDeleteCrew(id: number) {
    setCrewDialog(null);
    removeCrew(id);
  }

  // ---------------------------------------------------------------------------
  // DND-KIT (DRAG AND DROP)
  // ---------------------------------------------------------------------------
  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeProj = projects.find((p) => p.id === active.id);
    if (!activeProj) return;

    const overId = over.id as string;

    // 1. Визначаємо ЛИШЕ цільову бригаду — байдуже, чи "over" це доріжка, чи картка
    let targetCrewId = activeProj.crewId;
    if (overId.startsWith("lane-")) {
      targetCrewId = parseInt(overId.replace("lane-", ""), 10);
    } else {
      const overProj = projects.find((p) => p.id === overId);
      if (overProj) {
        targetCrewId = overProj.crewId;
      }
    }

    // 2. Індекс рахуємо ЗАВЖДИ за реальною піксельною позицією курсора
    //    відносно лівого краю ЦІЛЬОВОЇ доріжки — уніфіковано для всіх випадків
    const activeRect = active.rect.current.translated;
    const laneEl = laneRefs.current[targetCrewId];

    let targetIndex: number;
    if (activeRect && laneEl) {
      const laneRect = laneEl.getBoundingClientRect();
      const pointerX = activeRect.left + activeRect.width / 2 - laneRect.left;
      targetIndex = computeDropIndex(
        targetCrewId,
        pointerX,
        active.id as string
      );
    } else {
      const laneProjects = projects.filter((p) => p.crewId === targetCrewId);
      targetIndex = laneProjects.length;
    }

    updateProjects((prev) => {
      const current = prev.find((p) => p.id === active.id);
      if (!current) return prev;

      const without = prev.filter((p) => p.id !== active.id);
      const lane = without.filter((p) => p.crewId === targetCrewId);
      lane.splice(targetIndex, 0, { ...current, crewId: targetCrewId });

      const reindexedLane = lane.map((p, idx) => ({ ...p, position: idx }));
      const others = without.filter((p) => p.crewId !== targetCrewId);

      return [...others, ...reindexedLane];
    });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 dark:text-steel font-mono text-sm bg-white dark:bg-ink">
        Завантаження графіка...
      </div>
    );
  }

  const activeProject = scheduled.find((p) => p.id === activeId);

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-ink text-slate-900 dark:text-chalk select-none transition-colors">
      {/* ВЕРХНЯ ПАНЕЛЬ */}
      <div className="flex items-center justify-between border-b border-slate-300 dark:border-grid px-6 py-3 bg-white dark:bg-panel/50 backdrop-blur-sm transition-colors shadow-xs">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-chalk flex items-center gap-2">
            Графік монтажів СЕС
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              connected
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-600 dark:bg-emerald-400" : "bg-amber-600 dark:bg-amber-400"
              }`}
            />
            {connected ? "Supabase Active" : "Local Mode"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setCrewDialog({ kind: "add" })}
            className="flex items-center gap-1.5 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-chalk border border-slate-300 dark:border-white/10 transition shadow-xs"
          >
            <Plus size={14} />
            <Users size={14} className="text-cyan-600 dark:text-cyan" />
            Додати бригаду
          </button>
        </div>
      </div>

      {/* ДОШКА ГАНТТА */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex rounded-lg border-2 border-slate-300 dark:border-grid bg-white dark:bg-panel shadow-xl transition-colors overflow-hidden">
            {/* 1. ФІКСОВАНА ЛІВА ПАНЕЛЬ БРИГАД */}
            <div className="w-64 shrink-0 border-r-2 border-slate-300 dark:border-grid bg-slate-50 dark:bg-panel z-20 flex flex-col transition-colors">
              <div className="border-b-2 border-slate-300 dark:border-grid px-4 font-mono text-xs font-bold text-slate-600 dark:text-steel flex items-center justify-between bg-slate-100 dark:bg-panel h-[57px]">
                <span>БРИГАДИ</span>
                <span className="text-[10px] text-slate-500 dark:text-steel/65">36px / день</span>
              </div>

              <div className="divide-y divide-slate-300 dark:divide-grid flex-1">
                {crews.map((crew) => {
                  const crewProjects = scheduled.filter(
                    (p) => p.crewId === crew.id
                  );
                  const totalPower = crewProjects.reduce(
                    (sum, p) => sum + (p.powerKw || 0),
                    0
                  );

                  return (
                    <div
                      key={crew.id}
                      className="p-4 bg-white dark:bg-panel flex items-center justify-between h-[96px] transition-colors border-b border-slate-300 dark:border-grid"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-chalk">
                            {crew.name}
                          </span>
                          <button
                            onClick={() =>
                              setCrewDialog({ kind: "edit", crew })
                            }
                            className="text-slate-500 dark:text-steel hover:text-cyan-600 dark:hover:text-cyan transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-white/5"
                            title="Редагувати бригаду"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-steel">
  <span className="whitespace-nowrap font-mono">
    Старт: <strong className="text-slate-900 dark:text-chalk">{crew.anchorDate}</strong>
  </span>
  
  {totalPower > 0 && (
    <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-0.5 whitespace-nowrap bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
      <Zap size={11} /> {totalPower} кВт
    </span>
  )}
</div>
                      </div>

<button
  onClick={() =>
    setProjectDialog({ kind: "add", crewId: crew.id })
  }
  className="p-1.5 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-grid/40 dark:hover:bg-cyan/20 text-slate-700 hover:text-slate-900 dark:text-steel dark:hover:text-cyan transition-colors border border-slate-300 dark:border-transparent"
  title="Додати проєкт для цієї бригади"
>
  <Plus size={16} />
</button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. ПРАВА СКРОЛЕНА ЧАСТИНА (З ПІДТРИМКОЮ ПЕРЕТЯГУВАННЯ МИШЕЮ) */}
            <div
              className="flex-1 overflow-x-auto cursor-grab active:cursor-grabbing select-none bg-white dark:bg-panel"
              onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest(".no-dnd") ||
                  target.closest("[role='button']") ||
                  e.button !== 0
                )
                  return;

                const el = e.currentTarget;
                const startX = e.clientX;
                const startScrollLeft = el.scrollLeft;

                function onPointerMove(moveEvent: PointerEvent) {
                  const deltaX = moveEvent.clientX - startX;
                  el.scrollLeft = startScrollLeft - deltaX;
                }

                function onPointerUp() {
                  window.removeEventListener("pointermove", onPointerMove);
                  window.removeEventListener("pointerup", onPointerUp);
                }

                window.addEventListener("pointermove", onPointerMove);
                window.addEventListener("pointerup", onPointerUp);
              }}
            >
              <div className="inline-block min-w-full">
                {/* Шкала днів (фіксована висота h-[57px]) */}
                <div className="flex border-b-2 border-slate-300 dark:border-grid bg-slate-100 dark:bg-panel/90 h-[57px] transition-colors">
                  {(Array.isArray(dateRange) ? dateRange : []).map((d) => (
                    <div
                      key={d.iso}
                      style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                      className={`shrink-0 border-r border-slate-300 dark:border-grid/40 py-1.5 text-center text-xs font-mono transition-colors flex flex-col justify-center ${
                        d.isWeekend
                          ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold"
                          : "text-slate-600 dark:text-steel"
                      }`}
                    >
                      <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-steel/70 leading-none">
                        {d.dayName}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-chalk text-xs my-0.5 leading-tight">
                        {d.dayNum}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-steel/50 leading-none">
                        {d.monthName}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Доріжки проєктів праворуч — droppable-зони з реєстрацією рефів */}
                <div className="divide-y divide-slate-300 dark:divide-grid">
                  {crews.map((crew) => {
                    const crewProjects = scheduled.filter(
                      (p) => p.crewId === crew.id
                    );

                    return (
                      <Lane
                        key={crew.id}
                        crewId={crew.id}
                        totalWidth={totalTimelineWidth}
                        registerRef={registerLaneRef}
                      >
                        <SortableContext
                          items={crewProjects.map((p) => p.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          {crewProjects.map((project, idx) => {
                            const firstDayIso = dateRange[0]?.iso;

                            let marginLeft = 0;
                            if (idx === 0) {
                              const offsetDays = firstDayIso
                                ? calendarDaysBetween(
                                    firstDayIso,
                                    project.startDate
                                  )
                                : 0;
                              marginLeft = Math.max(0, offsetDays) * DAY_WIDTH;
                            } else {
                              marginLeft = 0;
                            }

                            return (
                              <div
                                key={project.id}
                                style={{ marginLeft: `${marginLeft}px` }}
                                className="flex items-center shrink-0"
                              >
                                <ProjectCard
                                  project={project}
                                  dayWidth={DAY_WIDTH}
                                  onEdit={(id: string) => {
                                    const p = projects.find(
                                      (item) => item.id === id
                                    );
                                    if (p)
                                      setProjectDialog({
                                        kind: "edit",
                                        project: p,
                                      });
                                  }}
                                  onResizeCommit={handleResizeCommit}
                                />
                              </div>
                            );
                          })}
                        </SortableContext>
                      </Lane>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeProject ? (
            <ProjectCard
              project={activeProject}
              dayWidth={DAY_WIDTH}
              onEdit={() => {}}
              onResizeCommit={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {projectDialog && (
        <ProjectDialog
          mode={projectDialog}
          crews={crews}
          onClose={() => setProjectDialog(null)}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}

      {crewDialog && (
        <CrewDialog
          mode={crewDialog}
          onClose={() => setCrewDialog(null)}
          onSave={handleSaveCrew}
          onDelete={handleDeleteCrew}
        />
      )}
    </div>
  );
}