import { Crew, ProjectItem } from "./types";

const today = new Date().toISOString().slice(0, 10);

export function makeDemoCrews(): Crew[] {
  return [
    { id: 1, name: "1 КБ", anchorDate: today },
    { id: 2, name: "2 КБ", anchorDate: today },
    { id: 3, name: "3 ЖБ", anchorDate: today },
    { id: 4, name: "4 КБ", anchorDate: today },
  ];
}

export function makeDemoProjects(): ProjectItem[] {
  return [
    { id: "d1", crewId: 1, name: "Фундамент — вул. Садова 12", duration: 6, color: "#4FC1D1", position: 0 },
    { id: "d2", crewId: 1, name: "Каркас — вул. Садова 12", duration: 10, color: "#63B37C", position: 1 },
    { id: "d3", crewId: 1, name: "Покрівля — вул. Садова 12", duration: 5, color: "#E3A73D", position: 2 },

    { id: "d4", crewId: 2, name: "Земляні роботи — Котедж №4", duration: 4, color: "#9B7FE0", position: 0 },
    { id: "d5", crewId: 2, name: "Фундамент — Котедж №4", duration: 7, color: "#4FC1D1", position: 1 },

    { id: "d6", crewId: 3, name: "Мурування — Склад Б", duration: 12, color: "#E2604F", position: 0 },
    { id: "d7", crewId: 3, name: "Утеплення — Склад Б", duration: 6, color: "#63B37C", position: 1 },
    { id: "d8", crewId: 3, name: "Фасад — Склад Б", duration: 8, color: "#E3A73D", position: 2 },

    { id: "d9", crewId: 4, name: "Електромонтаж — Офіс центр", duration: 9, color: "#6FA8DC", position: 0 },
    { id: "d10", crewId: 4, name: "Сантехніка — Офіс центр", duration: 7, color: "#9B7FE0", position: 1 },
  ];
}
