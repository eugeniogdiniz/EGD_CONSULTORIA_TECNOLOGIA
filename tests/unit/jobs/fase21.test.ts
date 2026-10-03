import { describe, it, expect } from "vitest";
import { applyOverride, isDue, nextRunAt, parseTime, type Schedule } from "@/modules/jobs/schedule";
import { nextAttemptAt, signWebhook, verifyWebhook, MAX_ATTEMPTS } from "@/modules/webhooks/sign";
import { compareWeekly, deltaLabel, portfolioDelta, snapshotRows, type PortfolioRow, type WeeklyReport } from "@/modules/reports/build";

describe("horário sobrescrito", () => {
  const daily: Schedule = { kind: "daily", hour: 7, minute: 30 };
  it("applyOverride troca só hora e minuto; nulos mantêm o padrão", () => {
    expect(applyOverride(daily, { hour: 9, minute: 15 })).toEqual({ kind: "daily", hour: 9, minute: 15 });
    expect(applyOverride(daily, { hour: null, minute: null })).toEqual(daily);
    expect(applyOverride(daily, null)).toEqual(daily);
    // 08:00 SP = 11:00 UTC: devida com o padrão (07:30), não com o ajuste (09:15)
    const at = new Date("2026-10-02T11:00:00Z");
    expect(isDue(daily, at)).toBe(true);
    expect(isDue(applyOverride(daily, { hour: 9, minute: 15 }), at)).toBe(false);
    expect(nextRunAt(applyOverride(daily, { hour: 9, minute: 15 }), at)).toEqual({ date: "2026-10-02", time: "09:15" });
  });
  it("parseTime aceita HH:MM e recusa inválidos", () => {
    expect(parseTime("09:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseTime("23:59")).toEqual({ hour: 23, minute: 59 });
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("x")).toBeNull();
    expect(parseTime("")).toBeNull();
  });
});

describe("assinatura de webhook", () => {
  it("assina e verifica; rejeita segredo errado, corpo alterado e relógio fora da janela", () => {
    const ts = 1_790_000_000;
    const sig = signWebhook("whsec_x", ts, "{\"a\":1}");
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(verifyWebhook("whsec_x", ts, "{\"a\":1}", sig, ts * 1000)).toBe(true);
    expect(verifyWebhook("whsec_y", ts, "{\"a\":1}", sig, ts * 1000)).toBe(false);
    expect(verifyWebhook("whsec_x", ts, "{\"a\":2}", sig, ts * 1000)).toBe(false);
    expect(verifyWebhook("whsec_x", ts, "{\"a\":1}", sig, ts * 1000 + 10 * 60_000)).toBe(false);
  });
  it("backoff das entregas: 1, 5, 15, 60, 180 min e desiste depois da 5ª", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    expect(nextAttemptAt(1, now)?.toISOString()).toBe("2026-10-03T12:01:00.000Z");
    expect(nextAttemptAt(2, now)?.toISOString()).toBe("2026-10-03T12:05:00.000Z");
    expect(nextAttemptAt(4, now)?.toISOString()).toBe("2026-10-03T13:00:00.000Z");
    expect(nextAttemptAt(MAX_ATTEMPTS, now)).toBeNull();
  });
});

describe("comparação entre períodos", () => {
  const row = (overdue: number, percent: number | null): PortfolioRow => ({ id: "p", title: "P", companyName: "C", status: "active", percent, total: 10, done: 5, nextMilestone: null, overdue, blocked: 0, minutes: 0, laborCents: 0, expenseCents: 0, costCents: 0, budgetCents: null, consumption: null, band: null, nextDue: null });
  it("Δ do portfólio contra o snapshot; null sem foto; rótulos", () => {
    expect(portfolioDelta(row(3, 60), { projectId: "p", doneCount: 4, openCount: 6, overdueCount: 1, progressPct: 40 })).toEqual({ overdue: 2, progress: 20 });
    expect(portfolioDelta(row(3, 60), undefined)).toEqual({ overdue: null, progress: null });
    expect(deltaLabel(2)).toBe("▲ 2");
    expect(deltaLabel(-1)).toBe("▼ 1");
    expect(deltaLabel(0)).toBe("=");
    expect(deltaLabel(null)).toBe("—");
    expect(snapshotRows({ rows: [row(3, 60)], counts: { planning: 0, active: 1, on_hold: 0 }, overdueTotal: 3 })).toEqual([{ projectId: "p", doneCount: 5, openCount: 5, overdueCount: 3, progressPct: 60 }]);
  });
  it("semanal: soma concluído/vence/atrasado das duas semanas", () => {
    const w = (done: number, due: number, late: number): WeeklyReport => ({
      start: "2026-09-28", end: "2026-10-04", nextStart: "2026-10-05", nextEnd: "2026-10-11", label: "2026-S40", doneCount: done,
      projects: [{ id: "p", title: "P", companyName: "C", done: Array.from({ length: done }, (_, i) => ({ kind: "deliverable" as const, title: `d${i}`, date: "2026-09-29", daysLate: null })), due: Array.from({ length: due }, (_, i) => ({ kind: "deliverable" as const, title: `v${i}`, date: "2026-10-06", daysLate: null })), late: Array.from({ length: late }, (_, i) => ({ kind: "deliverable" as const, title: `a${i}`, date: "2026-09-01", daysLate: 3 })) }],
    });
    expect(compareWeekly(w(3, 2, 1), w(1, 2, 4))).toEqual({ done: 3, due: 2, late: 1, prevDone: 1, prevDue: 2, prevLate: 4 });
  });
});
