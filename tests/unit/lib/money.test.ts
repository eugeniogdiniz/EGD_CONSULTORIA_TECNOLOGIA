import { describe, it, expect } from "vitest";
import { centsToReais, reaisToCents } from "@/lib/money";

describe("reaisToCents", () => {
  it("aceita o jeito brasileiro, inteiro, decimal com ponto e prefixo R$", () => {
    expect(reaisToCents("1.500,00")).toBe(150000);
    expect(reaisToCents("1500")).toBe(150000);
    expect(reaisToCents("1500,5")).toBe(150050);
    expect(reaisToCents("1500.50")).toBe(150050);
    expect(reaisToCents("R$ 8.620,00")).toBe(862000);
    expect(reaisToCents("1.234.567,89")).toBe(123456789);
  });
  it("vazio é null; lixo é NaN", () => {
    expect(reaisToCents("")).toBeNull();
    expect(reaisToCents("   ")).toBeNull();
    expect(Number.isNaN(reaisToCents("abc"))).toBe(true);
    expect(Number.isNaN(reaisToCents("1,2,3"))).toBe(true);
  });
  it("ida e volta", () => {
    expect(centsToReais(862000)).toBe("8.620,00");
    expect(centsToReais(5)).toBe("0,05");
    expect(centsToReais(null)).toBe("");
    expect(reaisToCents(centsToReais(123456789))).toBe(123456789);
  });
});
