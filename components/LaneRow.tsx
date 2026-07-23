"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Crew } from "@/lib/types";
import { ScheduledProject } from "@/lib/scheduler";
import { ProjectCard } from "./ProjectCard";

export function LaneRow({
  crew,
  items,
  laneLabelWidth,
  dayWidth,
  offsetDays,
  accentColor,
  onEditProject,
  onResizeCommit,
  onAddClick,
}: {
  crew: Crew;
  items: ScheduledProject[];
  laneLabelWidth: number;
  dayWidth: number;
  offsetDays: number;
  accentColor: string;
  onEditProject: (id: string) => void;
  onResizeCommit: (id: string, newDuration: number) => void;
  onAddClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane-${crew.id}` });

  return (
    <div className="flex border-b border-grid">
      <div
        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-1 border-r border-grid bg-ink px-3 py-2"
        style={{ width: laneLabelWidth }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-sm font-semibold text-chalk">{crew.name}</span>
        </div>
        <button
          onClick={onAddClick}
          className="flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-steel hover:bg-panel hover:text-chalk"
        >
          <Plus size={12} /> додати проєкт
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={
          "flex min-h-[76px] flex-1 items-center py-2 " +
          (isOver ? "bg-cyan/5" : "")
        }
        style={{ paddingLeft: offsetDays * dayWidth }}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={horizontalListSortingStrategy}
        >
          {items.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              dayWidth={dayWidth}
              onEdit={() => onEditProject(p.id)}
              onResizeCommit={onResizeCommit}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <span className="pl-2 text-xs italic text-steel/60">
            немає проєктів — перетягніть сюди або натисніть «додати»
          </span>
        )}
      </div>
    </div>
  );
}
