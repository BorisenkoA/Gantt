"use client";

import { useState, useEffect } from "react";
import { ProjectItem, Crew } from "@/lib/types";

export type DialogMode =
  | { kind: "add"; crewId?: number }
  | { kind: "edit"; project: ProjectItem };

export interface ProjectFormData {
  id?: string;
  crewId: number;
  name: string;
  duration: number;
  color: string;
  pauseDays: number;
  powerKw?: number;
  startDate?: string;
}

interface ProjectDialogProps {
  mode: DialogMode;
  crews?: Crew[];
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
  onDelete?: (id: string) => void;
}

const PRESET_COLORS = [
  "#38bdf8", // Cyan
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#22c55e", // Green
  "#ef4444", // Red
  "#e879f9", // Pink
  "#60a5fa", // Blue
  "#d97706", // Dark Amber
];

export function ProjectDialog({
  mode,
  crews = [],
  onClose,
  onSave,
  onDelete,
}: ProjectDialogProps) {
  const isEdit = mode.kind === "edit";
  const activeProject = isEdit ? mode.project : null;
  const defaultCrewId = !isEdit ? mode.crewId || crews[0]?.id || 1 : 1;

  const [name, setName] = useState("");
  const [powerKw, setPowerKw] = useState("");
  const [duration, setDuration] = useState(5);
  const [pauseDays, setPauseDays] = useState(0);
  const [crewId, setCrewId] = useState(defaultCrewId);
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (activeProject) {
      setName(activeProject.name || "");
      setPowerKw(activeProject.powerKw ? String(activeProject.powerKw) : "");
      setDuration(activeProject.duration || 5);
      setPauseDays(activeProject.pauseDays || 0);
      setCrewId(activeProject.crewId || defaultCrewId);
      setColor(activeProject.color || PRESET_COLORS[0]);
    } else {
      setName("");
      setPowerKw("");
      setDuration(5);
      setPauseDays(0);
      setCrewId(defaultCrewId);
      setColor(PRESET_COLORS[0]);
    }
  }, [activeProject, defaultCrewId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...(activeProject?.id ? { id: activeProject.id } : {}),
      name: name.trim(),
      startDate: undefined, // Дати немає, працює чистий автокаскад
      powerKw: powerKw ? Number(powerKw) : undefined,
      duration: Math.max(1, Number(duration) || 5),
      pauseDays: Math.max(0, Number(pauseDays) || 0),
      crewId: Number(crewId) || defaultCrewId,
      color,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Редагувати проєкт СЕС" : "Новий проєкт СЕС"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Назва */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Назва об'єкта / замовника
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Дударків"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Потужність */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Потужність СЕС (кВт)
            </label>
            <div className="relative">
              <input
                type="number"
                value={powerKw}
                onChange={(e) => setPowerKw(e.target.value)}
                placeholder="напр. 15 або 30"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500">
                кВт
              </span>
            </div>
          </div>

          {/* Тривалість та Пауза */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Тривалість (днів)
              </label>
              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDuration((d) => Math.max(1, d - 1))}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-sm font-bold text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDuration((d) => d + 1)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Пауза після (днів)
              </label>
              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPauseDays((p) => Math.max(0, p - 1))}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={pauseDays}
                  onChange={(e) => setPauseDays(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-sm font-bold text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPauseDays((p) => p + 1)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Вибір Бригади */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Бригада
            </label>
            <select
              value={crewId}
              onChange={(e) => setCrewId(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {crews.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Колір картки */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Колір картки
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-white" : "opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Дії */}
          <div className="flex justify-between items-center pt-4">
            <div>
              {isEdit && activeProject && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(activeProject.id)}
                  className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium hover:bg-rose-500/20 transition-colors"
                >
                  Видалити
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Скасувати
              </button>
              <button
                type="submit"
                style={{ backgroundColor: "#06b6d4", color: "#020617" }}
                className="px-4 py-2 rounded-lg text-xs font-black shadow-lg hover:opacity-90 transition-opacity"
              >
                {isEdit ? "Зберегти" : "Додати"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}