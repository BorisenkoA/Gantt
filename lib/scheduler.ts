import { Crew, ProjectItem, ScheduledProject, DateHeader } from "./types";

export type { ScheduledProject, DateHeader };

export function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getDay() === 0;
}

/**
 * Додає дні з урахуванням вихідних (неділя пропускається).
 */
export function addWorkingDays(startDateStr: string, durationDays: number): string {
  if (!startDateStr || durationDays <= 0) return startDateStr;

  let current = new Date(startDateStr);
  if (current.getDay() === 0) {
    current.setDate(current.getDate() + 1);
  }

  let added = 1;
  while (added < durationDays) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() !== 0) {
      added++;
    }
  }

  return current.toISOString().split("T")[0];
}

/**
 * Додає прості календарні дні
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Кількість календарних днів між двома датами
 */
export function calendarDaysBetween(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr);
  const e = new Date(endStr);
  const diffTime = e.getTime() - s.getTime();
  return Math.round(diffTime / (1000 * 3600 * 24));
}

/**
 * Розрахунок каскаду проєктів (повністю автоматичний каскад без ручних дат)
 */
export function computeSchedule(
  crews: Crew[],
  projects: ProjectItem[]
): ScheduledProject[] {
  const scheduled: ScheduledProject[] = [];

  for (const crew of crews) {
    const crewProjects = projects
      .filter((p) => p.crewId === crew.id)
      .sort((a, b) => a.position - b.position);

    let prevEndWithPause: string | null = null;

    for (const project of crewProjects) {
      let startDate: string;

      // ЗАВЖДИ вираховуємо дату автоматично (ігноруємо старі startDate з бази)
      if (prevEndWithPause) {
        const nextDay = addDays(prevEndWithPause, 1);
        startDate = isSunday(nextDay) ? addDays(nextDay, 1) : nextDay;
      } else {
        startDate = isSunday(crew.anchorDate) ? addDays(crew.anchorDate, 1) : crew.anchorDate;
      }

      // Розраховуємо кінцеву дату
      const endDate = addWorkingDays(startDate, project.duration);

      scheduled.push({
        ...project,
        startDate, // оновлена розрахована дата замість старої ручної
        endDate,
      });

      // Фіксуємо кінцеву точку для наступного елемента з урахуванням паузи
      const pauseDays = project.pauseDays || 0;
      prevEndWithPause = addDays(endDate, pauseDays);
    }
  }

  return scheduled;
}

export function getDateRange(scheduled: ScheduledProject[]): DateHeader[] {
  if (!scheduled.length) return [];

  let minDate = scheduled[0].startDate;
  let maxDate = scheduled[0].endDate;

  for (const p of scheduled) {
    if (p.startDate && p.startDate < minDate) minDate = p.startDate;
    if (p.endDate) {
      const fullEnd = addDays(p.endDate, p.pauseDays || 0);
      if (fullEnd > maxDate) maxDate = fullEnd;
    }
  }

  const result: DateHeader[] = [];
  const curr = new Date(minDate);
  const end = new Date(maxDate);
  end.setDate(end.getDate() + 14); // 2 тижні запасу

  const monthsUk = [
    "січ.", "лют.", "берез.", "квіт.", "трав.", "черв.",
    "лип.", "серп.", "верес.", "жовт.", "листоп.", "груд."
  ];
  const daysUk = ["НД", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];

  while (curr <= end) {
    const dayOfWeek = curr.getDay();
    const iso = curr.toISOString().split("T")[0];

    result.push({
      iso,
      dayNum: curr.getDate(),
      dayName: daysUk[dayOfWeek],
      monthName: monthsUk[curr.getMonth()],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });

    curr.setDate(curr.getDate() + 1);
  }

  return result;
}

export function normalizePositions(
  projects: ProjectItem[],
  crewId: number
): ProjectItem[] {
  const lane = projects
    .filter((p) => p.crewId === crewId)
    .sort((a, b) => a.position - b.position);

  const reindexed = lane.map((p, idx) => ({ ...p, position: idx }));
  const others = projects.filter((p) => p.crewId !== crewId);

  return [...others, ...reindexed];
}