import { describe, it, expect } from "vitest";
import { buildBurndown, formatHours, hoursToMinutes } from "@/modules/projects/burndown";

const d = (estimateMinutes: number | null, done: string | null, dueAt: string | null = null) => ({ estimateMinutes, completedAt: done ? new Date(`${done}T12:00:00Z`) : null, dueAt, status: done ? "done" : "doing" });

describe("buildBurndown", () => {
  it("sem estimativas: total 0 e contagem de não estimadas", () => {
    const b = buildBurndown([d(null, null), d(0, null)], { from: "2026-09-07", to: null, today: "2026-09-21" });
    expect(b.totalMinutes).toBe(0);
    expect(b.unestimated).toBe(2);
    expect(b.points.length).toBeGreaterThan(0);
  });
  it("restante cai na semana em que a entrega conclui; ideal vai do total a zero no último prazo", () => {
    const b = buildBurndown([d(600, "2026-09-16", "2026-09-30"), d(600, null, "2026-09-28")], { from: "2026-09-07", to: null, today: "2026-09-28" });
    expect(b.totalMinutes).toBe(1200);
    expect(b.from).toBe("2026-09-07");
    expect(b.points.map((p) => p.weekStart)).toEqual(["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(b.points.map((p) => p.remainingMinutes)).toEqual([1200, 600, 600, 600]);
    expect(b.points[0].idealMinutes).toBe(1200);
    expect(b.points.at(-1)!.idealMinutes).toBeLessThan(600);
    expect(b.doneMinutes).toBe(600);
  });
  it("semanas futuras não têm restante real (NaN) e o eixo vai até o último prazo", () => {
    const b = buildBurndown([d(300, null, "2026-10-26")], { from: "2026-10-05", to: null, today: "2026-10-07" });
    expect(b.points.at(-1)!.weekStart).toBe("2026-10-26");
    expect(Number.isNaN(b.points.at(-1)!.remainingMinutes)).toBe(true);
    expect(b.points[0].remainingMinutes).toBe(300);
  });
  it("conversões de horas", () => {
    expect(hoursToMinutes("1,5")).toBe(90);
    expect(hoursToMinutes("")).toBeNull();
    expect(hoursToMinutes("-1")).toBeNull();
    expect(formatHours(90)).toBe("1,5 h");
    expect(formatHours(720)).toBe("12 h");
  });
});
