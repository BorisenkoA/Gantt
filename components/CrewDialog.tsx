"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Users } from "lucide-react";
import { Crew } from "@/lib/types";

export type CrewDialogMode =
  | { kind: "add" }
  | { kind: "edit"; crew: Crew };

export function CrewDialog({
  mode,
  onClose,
  onSave,
  onDelete,
}: {
  mode: CrewDialogMode;
  onClose: () => void;
  onSave: (data: { id?: number; name: string; anchorDate: string }) => void;
  onDelete?: (id: number) => void;
}) {
  const isEdit = mode.kind === "edit";
  const initial = isEdit ? mode.crew : null;

  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState(initial?.name ?? "");
  const [anchorDate, setAnchorDate] = useState(initial?.anchorDate ?? today);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (!name.trim()) return;
    onSave({
      id: isEdit ? mode.crew.id : undefined,
      name: name.trim(),
      anchorDate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm">
      <div className="w-[360px] rounded-lg border border-grid bg-panel p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-cyan" />
            <h2 className="font-display text-base font-semibold text-chalk">
              {isEdit ? "Редагувати бригаду" : "Нова бригада"}
            </h2>
          </div>
          <button onClick={onClose} className="text-steel hover:text-chalk">
            <X size={18} />
          </button>
        </div>

        {/* Назва бригади */}
        <label className="mb-1 block text-xs font-medium text-steel">
          Назва бригади
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="напр. Бригада №3 (Захід)"
          className="mb-3 w-full rounded-md border border-grid bg-ink px-3 py-2 text-sm text-chalk placeholder:text-steel/60 focus:border-cyan focus:outline-none"
        />

        {/* Дата старту роботи бригади */}
        <label className="mb-1 block text-xs font-medium text-steel">
          Дата початку відліку (Anchor Date)
        </label>
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
          className="mb-5 w-full rounded-md border border-grid bg-ink px-3 py-2 text-sm text-chalk focus:border-cyan focus:outline-none font-mono"
        />

        {/* Кнопки дій */}
        <div className="flex items-center justify-between">
          {isEdit && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Ви впевнені, що хочете видалити бригаду "${mode.crew.name}"? Усі її проєкти також будуть видалені.`
                  )
                ) {
                  onDelete(mode.crew.id);
                }
              }}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 size={14} />
              Видалити
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-cyan px-4 py-2 text-sm font-medium text-ink hover:brightness-110"
          >
            {isEdit ? "Зберегти" : "Створити"}
          </button>
        </div>
      </div>
    </div>
  );
}