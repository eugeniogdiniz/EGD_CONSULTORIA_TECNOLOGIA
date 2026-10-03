import { describe, it, expect } from "vitest";
import { buildForecast, forecastCsv, type ForecastOpportunity } from "@/modules/crm/forecast";

const today = "2026-10-03";
const o = (p: Partial<ForecastOpportunity> & { stage: ForecastOpportunity["stage"] }): ForecastOpportunity => ({
  id: Math.random().toString(36).slice(2),
  title: "x",
  companyName: "C",
  valueCents: 100_000,
  expectedCloseAt: null,
  createdAt: new Date("2026-08-01T00:00:00Z"),
  wonAt: null,
  lostAt: null,
  lostReason: null,
  ...p,
});

describe("buildForecast", () => {
  it("pondera o pipeline por estágio e distribui por mês (vencidas no mês corrente, sem data à parte)", () => {
    const f = buildForecast(
      [
        o({ stage: "new", expectedCloseAt: "2026-10-20" }),
        o({ stage: "proposal", valueCents: 200_000, expectedCloseAt: "2026-11-05" }),
        o({ stage: "meeting", expectedCloseAt: "2026-09-01" }), // vencida → mês corrente
        o({ stage: "qualified", expectedCloseAt: null }),
        o({ stage: "won", valueCents: 999 }),
      ],
      today,
    );
    expect(f.openCount).toBe(4);
    expect(f.openCents).toBe(500_000);
    expect(f.weightedCents).toBe(10_000 + 140_000 + 50_000 + 25_000);
    expect(f.byStage.find((s) => s.stage === "proposal")).toEqual({ stage: "proposal", count: 1, valueCents: 200_000, weightedCents: 140_000 });
    expect(f.byMonth[0]).toEqual({ month: "2026-10", count: 2, valueCents: 200_000, weightedCents: 60_000 });
    expect(f.byMonth[1]).toEqual({ month: "2026-11", count: 1, valueCents: 200_000, weightedCents: 140_000 });
    expect(f.byMonth).toHaveLength(6);
    expect(f.noDate).toEqual({ count: 1, weightedCents: 25_000 });
  });
  it("conversão por janela: ganhas e perdidas fora da janela não contam; ticket e ciclo médios", () => {
    const f = buildForecast(
      [
        o({ stage: "won", valueCents: 100_000, createdAt: new Date("2026-08-01T00:00:00Z"), wonAt: new Date("2026-09-10T00:00:00Z") }),
        o({ stage: "won", valueCents: 300_000, createdAt: new Date("2026-09-01T00:00:00Z"), wonAt: new Date("2026-09-21T00:00:00Z") }),
        o({ stage: "lost", lostAt: new Date("2026-09-15T00:00:00Z"), lostReason: "Preço" }),
        o({ stage: "lost", lostAt: new Date("2025-01-15T00:00:00Z"), lostReason: "preço " }),
        o({ stage: "won", valueCents: 50_000, createdAt: new Date("2025-01-01T00:00:00Z"), wonAt: new Date("2025-02-01T00:00:00Z") }),
      ],
      today,
    );
    const c90 = f.conversion.find((c) => c.window === 90)!;
    expect(c90).toMatchObject({ won: 2, lost: 1, rate: 67, avgTicketCents: 200_000, avgCycleDays: 30 });
    const c365 = f.conversion.find((c) => c.window === 365)!;
    expect(c365.won).toBe(2);
    expect(f.lostReasons).toEqual([{ reason: "preço", count: 2 }]);
  });
  it("vazio: taxas nulas e csv com cabeçalho", () => {
    const f = buildForecast([], today);
    expect(f.conversion[0].rate).toBeNull();
    expect(f.weightedCents).toBe(0);
    const csv = forecastCsv(f);
    expect(csv.headers[0]).toBe("Tabela");
    expect(csv.rows.some((r) => r[0] === "Esperado por mês" && r[1] === "sem data")).toBe(true);
  });
});
