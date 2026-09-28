import { describe, it, expect } from "vitest";
import {
  computeFinancials,
  computeMinutes,
  type FinancialsInput,
} from "@/modules/projects/time-math";

const d = (iso: string) => new Date(iso);

describe("computeMinutes", () => {
  it("30 minutos exatos = 30", () => {
    expect(computeMinutes(d("2026-09-28T10:00:00Z"), d("2026-09-28T10:30:00Z"))).toBe(30);
  });

  it("5m 30s arredonda para cima (6)", () => {
    expect(computeMinutes(d("2026-09-28T10:00:00Z"), d("2026-09-28T10:05:30Z"))).toBe(6);
  });

  it("1 segundo arredonda para 1", () => {
    expect(computeMinutes(d("2026-09-28T10:00:00Z"), d("2026-09-28T10:00:01Z"))).toBe(1);
  });

  it("mesmo instante = 0", () => {
    expect(computeMinutes(d("2026-09-28T10:00:00Z"), d("2026-09-28T10:00:00Z"))).toBe(0);
  });

  it("ended anterior a started lança", () => {
    expect(() =>
      computeMinutes(d("2026-09-28T10:00:00Z"), d("2026-09-28T09:00:00Z")),
    ).toThrow();
  });
});

describe("computeFinancials", () => {
  const base: FinancialsInput = {
    budgetCents: 100000, // R$ 1.000,00
    entries: [],
    expenses: [],
    proposals: [],
  };

  it("cenário vazio devolve zeros e margem 0", () => {
    const out = computeFinancials(base);
    expect(out).toEqual({
      budgetCents: 100000,
      laborCents: 0,
      expenseCents: 0,
      costCents: 0,
      revenueSentCents: 0,
      revenueAcceptedCents: 0,
      marginCents: 0,
      marginPct: 0,
      entriesWithoutRate: 0,
    });
  });

  it("labor: 60min a 60_00 cents/h vira 60_00 cents", () => {
    const out = computeFinancials({
      ...base,
      entries: [{ minutes: 60, hourlyRateCents: 6000 }],
    });
    expect(out.laborCents).toBe(6000);
    expect(out.entriesWithoutRate).toBe(0);
  });

  it("labor: minutos * rate / 60 arredonda para floor", () => {
    // 90 min * 10000 / 60 = 15000
    const out = computeFinancials({
      ...base,
      entries: [{ minutes: 90, hourlyRateCents: 10000 }],
    });
    expect(out.laborCents).toBe(15000);
  });

  it("entrada aberta (minutes null) não conta", () => {
    const out = computeFinancials({
      ...base,
      entries: [{ minutes: null, hourlyRateCents: 10000 }],
    });
    expect(out.laborCents).toBe(0);
  });

  it("entrada sem rate conta 0 e incrementa entriesWithoutRate", () => {
    const out = computeFinancials({
      ...base,
      entries: [{ minutes: 60, hourlyRateCents: null }],
    });
    expect(out.laborCents).toBe(0);
    expect(out.entriesWithoutRate).toBe(1);
  });

  it("expenses somam", () => {
    const out = computeFinancials({
      ...base,
      expenses: [{ amountCents: 1500 }, { amountCents: 2500 }],
    });
    expect(out.expenseCents).toBe(4000);
    expect(out.costCents).toBe(4000);
  });

  it("revenue: só accepted entra na margem; sent entra em revenueSent", () => {
    const out = computeFinancials({
      ...base,
      proposals: [
        { status: "sent", valueCents: 50000 },
        { status: "accepted", valueCents: 80000 },
        { status: "draft", valueCents: 999999 },
      ],
    });
    expect(out.revenueSentCents).toBe(50000);
    expect(out.revenueAcceptedCents).toBe(80000);
  });

  it("margem = receita aceita − custo (pode ser negativo)", () => {
    const out = computeFinancials({
      ...base,
      entries: [{ minutes: 60, hourlyRateCents: 10000 }],
      expenses: [{ amountCents: 5000 }],
      proposals: [{ status: "accepted", valueCents: 20000 }],
    });
    expect(out.costCents).toBe(15000);
    expect(out.marginCents).toBe(5000);
    expect(out.marginPct).toBe(25);
  });

  it("margem negativa quando custo excede receita aceita", () => {
    const out = computeFinancials({
      ...base,
      entries: [{ minutes: 60, hourlyRateCents: 10000 }],
      proposals: [{ status: "accepted", valueCents: 5000 }],
    });
    expect(out.marginCents).toBe(-5000);
    expect(out.marginPct).toBe(-100);
  });

  it("margemPct = 0 quando receita aceita é zero (evita div/0)", () => {
    const out = computeFinancials({
      ...base,
      entries: [{ minutes: 60, hourlyRateCents: 10000 }],
    });
    expect(out.marginPct).toBe(0);
  });
});
