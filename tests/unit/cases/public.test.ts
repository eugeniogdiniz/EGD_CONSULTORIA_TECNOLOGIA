import { describe, it, expect } from "vitest";
import { SIZE_LABEL, toPublicCase, computeTotals, parseDeliverables, reaisToCents, centsToReais } from "@/modules/cases/public";

const row = {
  slug: "acme",
  name: "Acme",
  sector: "Energia",
  size: "medium" as const,
  systems: 2,
  automations: 5,
  savingsCents: 12345678,
  capexCents: 100000,
  featured: true,
  deliverables: ["A", "B"],
  statusNote: null,
};

describe("toPublicCase", () => {
  it("converte centavos para reais e o porte para rótulo", () => {
    const c = toPublicCase(row);
    expect(c).toMatchObject({ id: "acme", nome: "Acme", setor: "Energia", porte: "Médio", sistemas: 2, automacoes: 5, destaque: true });
    expect(c.economia).toBeCloseTo(123456.78, 2);
    expect(c.capex).toBe(1000);
    expect(c.entregas).toEqual(["A", "B"]);
    expect(c.status).toBeUndefined();
  });
  it("propaga a nota de status", () => {
    expect(toPublicCase({ ...row, statusNote: "Em desenvolvimento" }).status).toBe("Em desenvolvimento");
  });
  it("cobre todos os portes", () => {
    expect(SIZE_LABEL).toEqual({ micro: "Micro", small: "Pequeno", medium: "Médio", large: "Grande" });
  });
});

describe("computeTotals", () => {
  it("soma clientes, sistemas, automações e economia", () => {
    const t = computeTotals([
      { ...row, systems: 3, automations: 15, savingsCents: 1000 },
      { ...row, slug: "b", systems: 1, automations: 2, savingsCents: 2550 },
    ]);
    expect(t).toEqual({ clientes: 2, sistemas: 4, automacoes: 17, economia: 35.5 });
  });
  it("zera com lista vazia", () => {
    expect(computeTotals([])).toEqual({ clientes: 0, sistemas: 0, automacoes: 0, economia: 0 });
  });
});

describe("parseDeliverables", () => {
  it("quebra por linha, apara e ignora vazias", () => {
    expect(parseDeliverables("  GED \n\n Vistoria\r\n")).toEqual(["GED", "Vistoria"]);
  });
  it("vazio vira lista vazia", () => {
    expect(parseDeliverables("")).toEqual([]);
  });
});

describe("reais <-> centavos", () => {
  it("aceita vírgula decimal e ponto de milhar", () => {
    expect(reaisToCents("1.234,56")).toBe(123456);
    expect(reaisToCents("459482,8")).toBe(45948280);
    expect(reaisToCents("")).toBe(0);
  });
  it("devolve NaN para texto inválido", () => {
    expect(Number.isNaN(reaisToCents("abc"))).toBe(true);
  });
  it("formata de volta", () => {
    expect(centsToReais(123456)).toBe("1.234,56");
    expect(centsToReais(0)).toBe("");
  });
});
