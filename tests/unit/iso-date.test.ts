import { describe, expect, it } from "vitest";
import { isIsoDate } from "@/lib/iso-date";

describe("isIsoDate", () => {
  it("aceita datas reais", () => {
    expect(isIsoDate("2026-10-01")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("recusa datas que não existem no calendário", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-04-31")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-00-10")).toBe(false);
  });

  it("recusa outros formatos", () => {
    expect(isIsoDate("01/10/2026")).toBe(false);
    expect(isIsoDate("2026-1-1")).toBe(false);
    expect(isIsoDate("2026-10-01T00:00")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});
