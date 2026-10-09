import { describe, it, expect } from "vitest";
import { documentSections, emptyDocument, investmentMismatch, parseStoredDocument, proposalDocumentSchema } from "@/modules/crm/document";

describe("proposalDocumentSchema", () => {
  it("vazio vale e ganha padrões; lixo gravado volta ao padrão", () => {
    const d = emptyDocument();
    expect(d.approach).toHaveLength(3);
    expect(d.place).toBe("São Paulo");
    expect(parseStoredDocument({}).subtitle).toBe("Do desafio à próxima entrega");
    expect(parseStoredDocument({ context: 42 }).context).toBe("");
    expect(parseStoredDocument({ context: "x", approach: [] }).approach).toEqual([]);
  });
  it("recusa 13 entregas e valor negativo; aceita valor como string", () => {
    expect(proposalDocumentSchema.safeParse({ deliverables: Array.from({ length: 13 }, () => ({ title: "x" })) }).success).toBe(false);
    expect(proposalDocumentSchema.safeParse({ investment: [{ item: "a", amountCents: -1 }] }).success).toBe(false);
    expect(proposalDocumentSchema.parse({ investment: [{ item: "a", amountCents: "1500" }] }).investment[0].amountCents).toBe(1500);
  });
});

describe("investmentMismatch", () => {
  const base = emptyDocument();
  it("sem itens é 0; soma igual é 0; diferença é a diferença", () => {
    expect(investmentMismatch(base, 100_000)).toBe(0);
    expect(investmentMismatch({ investment: [{ item: "a", amountCents: 60_000, condition: "" }, { item: "b", amountCents: 40_000, condition: "" }] }, 100_000)).toBe(0);
    expect(investmentMismatch({ investment: [{ item: "a", amountCents: 60_000, condition: "" }] }, 100_000)).toBe(-40_000);
  });
});

describe("documentSections", () => {
  it("omite seções vazias, numera em sequência e sempre fecha com investimento e aprovação", () => {
    const d = { ...emptyDocument(), context: "Cenário atual.", approach: [] };
    const s = documentSections(d, { valueFormatted: "R$ 1.000,00", place: "SP", dateFormatted: "03/10/2026" });
    expect(s.map((x) => `${x.number} ${x.title}`)).toEqual(["01 Contexto", "02 Investimento", "03 Aprovação comercial"]);
    const inv = s[1];
    expect(inv.kind === "table" && inv.rows.at(-1)).toEqual(["Total", "R$ 1.000,00", "—"]);
    expect(s[2].kind === "text" && s[2].body).toContain("SP, 03/10/2026.");
  });

  it("mantém a entrega preenchida mesmo sem título", () => {
    const d = { ...emptyDocument(), deliverables: [{ title: "", acceptance: "Homologado pelo cliente", due: "Semana 4" }] };
    const s = documentSections(d, { valueFormatted: "R$ 1,00", place: "SP", dateFormatted: "03/10/2026" });
    const ent = s.find((x) => x.title === "Entregas previstas");
    expect(ent?.kind === "table" && ent.rows).toEqual([["", "Homologado pelo cliente", "Semana 4"]]);
  });
});
