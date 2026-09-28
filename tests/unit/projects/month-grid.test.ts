import { describe, it, expect } from "vitest";
import { buildMonthGrid, parseYearMonth } from "@/modules/projects/month-grid";

describe("parseYearMonth", () => {
  it("parses 2026-10 -> { year: 2026, month: 10 }", () => {
    expect(parseYearMonth("2026-10")).toEqual({ year: 2026, month: 10 });
  });

  it("rejeita formato inválido", () => {
    expect(() => parseYearMonth("2026/10")).toThrow();
    expect(() => parseYearMonth("2026-13")).toThrow();
    expect(() => parseYearMonth("2026-0")).toThrow();
    expect(() => parseYearMonth("26-10")).toThrow();
  });
});

describe("buildMonthGrid", () => {
  it("sempre devolve 6 semanas de 7 dias (42 células)", () => {
    const g = buildMonthGrid("2026-10");
    expect(g.weeks).toHaveLength(6);
    for (const w of g.weeks) expect(w).toHaveLength(7);
  });

  it("outubro/2026: dia 1 é quinta (index 3, Seg=0)", () => {
    // 2026-10-01 é quinta-feira
    const g = buildMonthGrid("2026-10");
    // primeira ocorrência de outside=false é o dia 1
    let firstNonOutsideIdx = -1;
    for (let i = 0; i < 42; i++) {
      const cell = g.weeks[Math.floor(i / 7)][i % 7];
      if (!cell.outside) {
        firstNonOutsideIdx = i;
        break;
      }
    }
    expect(firstNonOutsideIdx).toBe(3);
    expect(g.weeks[0][3].day).toBe(1);
  });

  it("dias antes do dia 1 vêm do mês anterior com outside=true", () => {
    const g = buildMonthGrid("2026-10");
    expect(g.weeks[0][0].outside).toBe(true);
    expect(g.weeks[0][0].day).toBe(28); // 28/set/2026
  });

  it("mês/ano do output batem com input", () => {
    const g = buildMonthGrid("2026-10");
    expect(g.year).toBe(2026);
    expect(g.month).toBe(10);
  });

  it("dias após o fim do mês vêm do mês seguinte com outside=true", () => {
    // outubro 2026 tem 31 dias; dia 31 é sábado. Overflow começa domingo (index 6 na última semana).
    const g = buildMonthGrid("2026-10");
    const last = g.weeks[5][6];
    expect(last.outside).toBe(true);
    // último dia do grid = 8/nov/2026 (dia 1 é domingo → seguem 2..8)
    expect(last.day).toBe(8);
  });

  it("fevereiro 2028 (bissexto) inclui 29", () => {
    const g = buildMonthGrid("2028-02");
    const dias = g.weeks.flat().filter((c) => !c.outside).map((c) => c.day);
    expect(dias).toContain(29);
    expect(Math.max(...dias)).toBe(29);
  });

  it("fevereiro 2027 (não bissexto) termina em 28", () => {
    const g = buildMonthGrid("2027-02");
    const dias = g.weeks.flat().filter((c) => !c.outside).map((c) => c.day);
    expect(Math.max(...dias)).toBe(28);
  });

  it("date em UTC ao meio-dia (evita fuso empurrar dia)", () => {
    const g = buildMonthGrid("2026-10");
    const cell = g.weeks[0][3]; // dia 1
    expect(cell.date.getUTCFullYear()).toBe(2026);
    expect(cell.date.getUTCMonth()).toBe(9); // outubro = index 9
    expect(cell.date.getUTCDate()).toBe(1);
  });

  it("aceita objeto { year, month }", () => {
    const g = buildMonthGrid({ year: 2026, month: 10 });
    expect(g.year).toBe(2026);
    expect(g.month).toBe(10);
  });
});
