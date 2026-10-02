import { describe, it, expect } from "vitest";
import { describeSchedule, isDue, isoWeekday, minutesInSaoPaulo, nextRunAt, periodKey, type Schedule } from "@/modules/jobs/schedule";

const daily: Schedule = { kind: "daily", hour: 7, minute: 30 };
const weekdays: Schedule = { kind: "weekdays", hour: 8, minute: 0 };
const monday: Schedule = { kind: "weekly", weekday: 1, hour: 8, minute: 15 };

describe("agenda em São Paulo", () => {
  it("minutos e dia da semana no fuso de Brasília", () => {
    // 10:59 UTC = 07:59 em SP (UTC-3)
    expect(minutesInSaoPaulo(new Date("2026-10-02T10:59:00Z"))).toBe(7 * 60 + 59);
    expect(isoWeekday("2026-10-05")).toBe(1); // segunda
    expect(isoWeekday("2026-10-04")).toBe(7); // domingo
  });

  it("chave do período: data para diária, semana ISO para semanal", () => {
    expect(periodKey(daily, new Date("2026-10-02T12:00:00Z"))).toBe("2026-10-02");
    // 02:00 UTC de sexta ainda é quinta em SP
    expect(periodKey(daily, new Date("2026-10-02T02:00:00Z"))).toBe("2026-10-01");
    expect(periodKey(monday, new Date("2026-10-02T12:00:00Z"))).toBe("2026-S40");
    // domingo 23:30 em SP (02:30 UTC de segunda) ainda é a semana anterior
    expect(periodKey(monday, new Date("2026-10-05T02:30:00Z"))).toBe("2026-S40");
    expect(periodKey(monday, new Date("2026-10-05T11:30:00Z"))).toBe("2026-S41");
  });

  it("devida só depois do horário, no dia elegível", () => {
    expect(isDue(daily, new Date("2026-10-02T10:29:00Z"))).toBe(false); // 07:29 SP
    expect(isDue(daily, new Date("2026-10-02T10:30:00Z"))).toBe(true); // 07:30 SP
    expect(isDue(daily, new Date("2026-10-02T23:00:00Z"))).toBe(true); // continua devida o dia todo
    expect(isDue(weekdays, new Date("2026-10-03T12:00:00Z"))).toBe(false); // sábado
    expect(isDue(weekdays, new Date("2026-10-02T12:00:00Z"))).toBe(true); // sexta
    expect(isDue(monday, new Date("2026-10-05T11:14:00Z"))).toBe(false); // segunda 08:14
    expect(isDue(monday, new Date("2026-10-05T11:15:00Z"))).toBe(true);
    expect(isDue(monday, new Date("2026-10-06T11:15:00Z"))).toBe(false); // terça
  });

  it("próxima execução pula fim de semana e dias já passados", () => {
    expect(nextRunAt(weekdays, new Date("2026-10-02T10:00:00Z"))).toEqual({ date: "2026-10-02", time: "08:00" });
    expect(nextRunAt(weekdays, new Date("2026-10-02T12:00:00Z"))).toEqual({ date: "2026-10-05", time: "08:00" });
    expect(nextRunAt(monday, new Date("2026-10-05T12:00:00Z"))).toEqual({ date: "2026-10-12", time: "08:15" });
    expect(nextRunAt(daily, new Date("2026-10-02T12:00:00Z"))).toEqual({ date: "2026-10-03", time: "07:30" });
  });

  it("descreve a agenda em português", () => {
    expect(describeSchedule(daily)).toBe("todo dia, 07:30");
    expect(describeSchedule(weekdays)).toBe("seg–sex, 08:00");
    expect(describeSchedule(monday)).toBe("segunda, 08:15");
  });
});
