"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
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

const DAY_WIDTH = 36; // Ширина одного календарного дня у пікселях

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const scheduled = computeSchedule(crews, projects);
  const dateRange = getDateRange(scheduled);

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
    let targetCrewId = activeProj.crewId;
    let targetIndex = 0;

    if (overId.startsWith("lane-")) {
      targetCrewId = parseInt(overId.replace("lane-", ""), 10);
      const laneProjects = projects.filter((p) => p.crewId === targetCrewId);
      targetIndex = laneProjects.length;
    } else {
      const overProj = projects.find((p) => p.id === overId);
      if (overProj) {
        targetCrewId = overProj.crewId;
        const laneProjects = projects.filter((p) => p.crewId === targetCrewId);
        targetIndex = laneProjects.findIndex((p) => p.id === overId);
      }
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
      <div className="flex h-64 items-center justify-center text-steel font-mono text-sm">
        Завантаження графіка...
      </div>
    );
  }

  const activeProject = scheduled.find((p) => p.id === activeId);

  return (
    <div className="flex flex-col h-full bg-ink text-chalk select-none">
      {/* ВЕРХНЯ ПАНЕЛЬ */}
      <div className="flex items-center justify-between border-b border-grid px-6 py-3 bg-panel/50">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold font-display text-chalk flex items-center gap-2">
            Графік монтажів СЕС
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              connected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {connected ? "Supabase Active" : "Local Mode"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCrewDialog({ kind: "add" })}
            className="flex items-center gap-1.5 rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-chalk border border-white/10 transition"
          >
            <Plus size={14} />
            <Users size={14} className="text-cyan" />
            Додати бригаду
          </button>
        </div>
      </div>

      {/* ДОШКА ГАНТТА */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex rounded-lg border border-grid bg-panel shadow-2xl">
            {/* 1. ФІКСОВАНА ЛІВА ПАНЕЛЬ БРИГАД */}
            <div className="w-64 shrink-0 border-r border-grid bg-panel z-20 flex flex-col">
              <div className="border-b border-grid p-3 font-mono text-xs font-bold text-steel flex items-center justify-between bg-panel h-[53px]">
                <span>БРИГАДИ</span>
                <span className="text-[10px] text-steel/60">36px / день</span>
              </div>

              <div className="divide-y divide-grid flex-1">
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
                      className="p-4 bg-panel flex items-center justify-between h-[96px]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-chalk">
                            {crew.name}
                          </span>
                          <button
                            onClick={() =>
                              setCrewDialog({ kind: "edit", crew })
                            }
                            className="text-steel hover:text-cyan transition-colors p-1 rounded hover:bg-white/5"
                            title="Редагувати бригаду"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs font-mono text-steel">
                          <span>Старт: {crew.anchorDate}</span>
                          {totalPower > 0 && (
                            <span className="text-amber-400 font-bold flex items-center gap-0.5">
                              <Zap size={11} /> {totalPower} кВт
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setProjectDialog({ kind: "add", crewId: crew.id })
                        }
                        className="p-1.5 rounded-md bg-grid/40 hover:bg-cyan/20 text-steel hover:text-cyan transition-colors"
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
              className="flex-1 overflow-x-auto cursor-grab active:cursor-grabbing select-none"
              onPointerDown={(e) => {
                if (
                  (e.target as HTMLElement).closest(".no-dnd") ||
                  (e.target as HTMLElement).closest("[role='button']") ||
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
                {/* Шкала днів */}
                <div className="flex border-b border-grid bg-panel/90">
                  {(Array.isArray(dateRange) ? dateRange : []).map((d) => (
                    <div
                      key={d.iso}
                      style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                      className={`shrink-0 border-r border-grid/40 py-2 text-center text-xs font-mono transition-colors ${
                        d.isWeekend
                          ? "bg-white/[0.05] text-amber-300 font-bold"
                          : "text-steel"
                      }`}
                    >
                      <div className="text-[9px] uppercase font-bold text-steel/70">
                        {d.dayName}
                      </div>
                      <div className="font-bold text-chalk text-xs my-0.5">
                        {d.dayNum}
                      </div>
                      <div className="text-[9px] text-steel/50">
                        {d.monthName}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Доріжки проєктів праворуч */}
                <div className="divide-y divide-grid">
                  {crews.map((crew) => {
                    const crewProjects = scheduled.filter(
                      (p) => p.crewId === crew.id
                    );

                    return (
                      <div
                        key={crew.id}
                        id={`lane-${crew.id}`}
                        className="flex items-center h-[96px] relative"
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
                      </div>
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