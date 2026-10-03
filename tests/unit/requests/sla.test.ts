import { describe, it, expect } from "vitest";
import { addBusinessHours, businessMinutesBetween, businessDaysBetween, firstResponseDueAt, formatBusinessMinutes, formatSla, nextBusinessInstant, slaState } from "@/modules/requests/sla";

// SP = UTC-3 (sem horário de verão). 2026-10-02 é sexta.
const sp = (iso: string) => new Date(`${iso}:00-03:00`);

describe("expediente", () => {
  it("dentro do horário fica onde está; antes das 9 vai para as 9; depois das 18 vai para o dia útil seguinte", () => {
    expect(nextBusinessInstant(sp("2026-10-01T10:30")).toISOString()).toBe(sp("2026-10-01T10:30").toISOString());
    expect(nextBusinessInstant(sp("2026-10-01T07:15")).toISOString()).toBe(sp("2026-10-01T09:00").toISOString());
    expect(nextBusinessInstant(sp("2026-10-01T18:00")).toISOString()).toBe(sp("2026-10-02T09:00").toISOString());
    // sexta 19h → segunda 9h; sábado meio-dia → segunda 9h
    expect(nextBusinessInstant(sp("2026-10-02T19:00")).toISOString()).toBe(sp("2026-10-05T09:00").toISOString());
    expect(nextBusinessInstant(sp("2026-10-03T12:00")).toISOString()).toBe(sp("2026-10-05T09:00").toISOString());
  });
});

describe("addBusinessHours", () => {
  it("soma dentro do dia", () => {
    expect(addBusinessHours(sp("2026-10-01T10:00"), 2).toISOString()).toBe(sp("2026-10-01T12:00").toISOString());
  });
  it("vira o dia quando passa das 18", () => {
    expect(addBusinessHours(sp("2026-10-01T16:30"), 4).toISOString()).toBe(sp("2026-10-02T11:30").toISOString());
  });
  it("pula o fim de semana e um dia útil inteiro são 9 h", () => {
    expect(addBusinessHours(sp("2026-10-02T17:00"), 2).toISOString()).toBe(sp("2026-10-05T10:00").toISOString());
    expect(addBusinessHours(sp("2026-10-01T09:00"), 9).toISOString()).toBe(sp("2026-10-02T09:00").toISOString());
  });
  it("criada fora do horário começa a contar na abertura seguinte", () => {
    expect(addBusinessHours(sp("2026-10-01T22:00"), 2).toISOString()).toBe(sp("2026-10-02T11:00").toISOString());
    expect(addBusinessHours(sp("2026-10-04T15:00"), 8).toISOString()).toBe(sp("2026-10-05T17:00").toISOString());
  });
  it("SLA por prioridade", () => {
    const created = sp("2026-10-01T09:00");
    expect(firstResponseDueAt(created, "urgent").toISOString()).toBe(sp("2026-10-01T11:00").toISOString());
    expect(firstResponseDueAt(created, "medium").toISOString()).toBe(sp("2026-10-01T17:00").toISOString());
    expect(firstResponseDueAt(created, "low").toISOString()).toBe(sp("2026-10-02T16:00").toISOString());
  });
});

describe("businessMinutesBetween", () => {
  it("ignora noite e fim de semana", () => {
    expect(businessMinutesBetween(sp("2026-10-01T17:00"), sp("2026-10-02T10:00"))).toBe(120);
    expect(businessMinutesBetween(sp("2026-10-02T17:00"), sp("2026-10-05T10:00"))).toBe(120);
    expect(businessMinutesBetween(sp("2026-10-02T10:00"), sp("2026-10-02T09:00"))).toBe(0);
    expect(businessDaysBetween(sp("2026-09-28T09:00"), sp("2026-10-05T09:00"))).toBe(5);
  });
});

describe("slaState e formatSla", () => {
  const base = { createdAt: sp("2026-10-01T09:00"), firstResponseDueAt: sp("2026-10-01T17:00"), firstResponseAt: null, status: "open" };
  it("pendente, estourado, respondida, resolvida sem resposta, sem SLA", () => {
    expect(slaState(base, sp("2026-10-01T14:00"))).toEqual({ kind: "pending", remainingMinutes: 180 });
    expect(slaState(base, sp("2026-10-02T10:00"))).toEqual({ kind: "breached", overdueMinutes: 120 });
    expect(slaState({ ...base, firstResponseAt: sp("2026-10-01T09:45") }, sp("2026-10-05T10:00"))).toEqual({ kind: "met", responseMinutes: 45 });
    expect(slaState({ ...base, status: "resolved" }, sp("2026-10-05T10:00"))).toEqual({ kind: "closed" });
    expect(slaState({ ...base, firstResponseDueAt: null }, sp("2026-10-05T10:00"))).toEqual({ kind: "none" });
  });
  it("textos", () => {
    expect(formatBusinessMinutes(45)).toBe("45 min");
    expect(formatBusinessMinutes(180)).toBe("3 h");
    expect(formatBusinessMinutes(80)).toBe("1 h 20");
    expect(formatBusinessMinutes(18 * 60)).toBe("2 dias úteis");
    expect(formatSla({ kind: "breached", overdueMinutes: 120 })).toEqual({ text: "SLA estourado há 2 h", tone: "err" });
    expect(formatSla({ kind: "pending", remainingMinutes: 30 }).tone).toBe("warn");
    expect(formatSla({ kind: "met", responseMinutes: 45 }).text).toBe("Respondida em 45 min");
  });
});
