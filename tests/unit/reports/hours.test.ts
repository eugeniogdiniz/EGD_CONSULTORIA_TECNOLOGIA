import { it, expect } from "vitest";
import { buildHoursReport, hoursCsv } from "@/modules/reports/hours";

it("agrupa por pessoa, ordena por horas e fecha totais; CSV tem linha de total por pessoa e geral", () => {
  const r = buildHoursReport([
    { userId: "a", userName: "Ana", projectId: "p1", projectTitle: "P1", minutes: 120, costCents: 20000, entriesWithoutRate: 0 },
    { userId: "b", userName: "Bia", projectId: "p1", projectTitle: "P1", minutes: 300, costCents: 0, entriesWithoutRate: 2 },
    { userId: "a", userName: "Ana", projectId: "p2", projectTitle: "P2", minutes: 60, costCents: 10000, entriesWithoutRate: 0 },
  ]);
  expect(r.people.map((p) => [p.userName, p.minutes, p.costCents])).toEqual([["Bia", 300, 0], ["Ana", 180, 30000]]);
  expect(r.people[1].projects.map((p) => p.projectTitle)).toEqual(["P1", "P2"]);
  expect(r.totalMinutes).toBe(480);
  expect(r.entriesWithoutRate).toBe(2);
  const csv = hoursCsv(r);
  expect(csv.rows.filter((x) => x[1] === "Total da pessoa")).toHaveLength(2);
  expect(csv.rows.at(-1)).toEqual(["Total", "", "8,00", "300,00", 2]);
});
