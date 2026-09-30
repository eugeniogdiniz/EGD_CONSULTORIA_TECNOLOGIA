import { describe, it, expect } from "vitest";
import {
  addDays,
  dateInSaoPaulo,
  daysBetween,
  formatBr,
  formatBrShort,
  formatMinutes,
  isoWeekLabel,
  mondayOf,
  parseWeekParam,
  todayInSaoPaulo,
} from "@/modules/reports/dates";

describe("datas do relatório", () => {
  it("hoje em São Paulo vira o dia anterior antes das 03h UTC", () => {
    expect(todayInSaoPaulo(new Date("2026-10-05T02:30:00Z"))).toBe("2026-10-04");
    expect(todayInSaoPaulo(new Date("2026-10-05T03:30:00Z"))).toBe("2026-10-05");
    expect(dateInSaoPaulo(new Date("2026-10-05T02:00:00Z"))).toBe("2026-10-04");
  });

  it("soma dias atravessando mês e ano", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-09-22", "2026-09-30")).toBe(8);
  });

  it("segunda-feira da semana", () => {
    expect(mondayOf("2026-09-30")).toBe("2026-09-28"); // quarta
    expect(mondayOf("2026-10-04")).toBe("2026-09-28"); // domingo
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
  });

  it("parâmetro de semana inválido cai na semana de hoje", () => {
    expect(parseWeekParam(undefined, "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam("", "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam("2026-13-45", "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam("2026-02-30", "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam("abc", "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam(["2026-10-07"], "2026-09-30")).toBe("2026-10-05");
    expect(parseWeekParam("2026-10-08", "2026-09-30")).toBe("2026-10-05");
  });

  it("rótulo ISO da semana", () => {
    expect(isoWeekLabel("2026-09-28")).toBe("2026-S40");
    expect(isoWeekLabel("2026-12-28")).toBe("2026-S53");
    expect(isoWeekLabel("2027-01-04")).toBe("2027-S01");
    expect(isoWeekLabel("2024-12-30")).toBe("2025-S01");
  });

  it("formatação brasileira", () => {
    expect(formatBr("2026-09-05")).toBe("05/09/2026");
    expect(formatBr(null)).toBe("");
    expect(formatBrShort("2026-09-05")).toBe("05/09");
    expect(formatMinutes(5190)).toBe("86h 30min");
    expect(formatMinutes(180)).toBe("3h");
    expect(formatMinutes(0)).toBe("0h");
    expect(formatMinutes(45)).toBe("0h 45min");
  });
});
