"use client";

import dynamic from "next/dynamic";

// Динамічно імпортуємо GanttBoard і вимикаємо SSR
const GanttBoard = dynamic(
  () => import("@/components/GanttBoard").then((mod) => mod.GanttBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-ink text-steel">
        <span className="text-sm">Завантаження графіка...</span>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="h-screen">
      <GanttBoard />
    </main>
  );
}