export type Crew = {
  id: number;
  name: string;
  anchorDate: string; // ISO yyyy-mm-dd, start date of the first project in this lane
};

export type ProjectItem = {
  id: string;
  crewId: number;
  name: string;
  duration: number; // days
  color: string; // hex
  position: number;
  pauseDays?: number;
  powerKw?: number;
  startDate?: string;
};

// 💡 Додано для розрахованих проєктів у розкладі
export type ScheduledProject = ProjectItem & {
  startDate: string;
  endDate: string;
};

// 💡 Додано для елементів верхньої шкали дат
export type DateHeader = {
  iso: string;
  dayNum: number;
  dayName: string;
  monthName: string;
  isWeekend: boolean;
};

export const CREW_ACCENTS = ["#4FC1D1", "#E3A73D", "#9B7FE0", "#63B37C"];

export const PROJECT_COLOR_PRESETS = [
  "#4FC1D1",
  "#E3A73D",
  "#9B7FE0",
  "#63B37C",
  "#E2604F",
  "#D8A6E0",
  "#6FA8DC",
  "#C9A876",
];
