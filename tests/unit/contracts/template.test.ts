import { describe, it, expect } from "vitest";
import { contractBlocks, fillTemplate, missingContractFields, type ContractRenderInput } from "@/modules/contracts/template";
import { contractFromProposal, emptyContractDocument, parseStoredContractDocument, DATA_DIMENSIONS } from "@/modules/contracts/document";
import { formatContractNumber } from "@/modules/contracts/number";
import { emptyDocument } from "@/modules/crm/document";

const parties: ContractRenderInput["parties"] = {
  egd: { razaoSocial: "EGD Consultoria Ltda", cnpj: "12.345.678/0001-90", endereco: "Rua A, 1, São Paulo/SP", representante: "Eugênio G. Diniz", cargo: "Consultor em Tecnologia" },
  client: { name: "Horizonte", legalName: "Construtora Horizonte S.A.", cnpj: "98.765.432/0001-10", address: "Av. B, 2, Campinas/SP", representativeName: "Marina Souza", representativeRole: "Diretora" },
};

const base: ContractRenderInput = {
  number: "CT-26-001",
  version: 1,
  issuedOn: "04/10/2026",
  proposal: { number: "PROP-26-007", version: 2, title: "Integração do ERP", valueCents: 4_850_000, acceptedOn: "03/10/2026" },
  parties,
  document: { ...emptyContractDocument(), projectDescription: "integração do ERP com o portal", clientEmail: "marina@horizonte.com", startDate: "01/11/2026", endDate: "31/01/2027", venue: "São Paulo/SP", objective: "Eliminar o retrabalho", deliverables: [{ title: "Conector", acceptance: "Pedidos sincronizados", due: "semana 4" }], installments: [{ milestone: "Assinatura", amountCents: 2_000_000, condition: "à vista" }, { milestone: "Entrega", amountCents: 2_850_000, condition: "30 dias" }] },
};

describe("fillTemplate", () => {
  it("troca placeholders e marca os vazios entre colchetes em caixa alta", () => {
    expect(fillTemplate("Foro: {{foro}}; prazo {{ prazoAviso }}.", { foro: "São Paulo/SP", prazoAviso: "" })).toBe("Foro: São Paulo/SP; prazo [PRAZO_AVISO].");
    expect(fillTemplate("{{x}}", {})).toBe("[X]");
  });
});

describe("missingContractFields", () => {
  it("nada falta no contrato completo; lista o que falta quando vazio", () => {
    expect(missingContractFields(base)).toEqual([]);
    const empty = { ...base, parties: { egd: { razaoSocial: "", cnpj: "", endereco: "", representante: "", cargo: "" }, client: { name: "X", legalName: "", cnpj: "", address: "", representativeName: "", representativeRole: "" } }, document: emptyContractDocument() };
    const m = missingContractFields(empty);
    expect(m).toContain("razão social da EGD");
    expect(m).toContain("CNPJ do cliente");
    expect(m).not.toContain("razão social do cliente"); // o nome fantasia serve
    expect(m).toContain("entregáveis (Anexo I)");
    expect(m).toContain("parcelas (Anexo I)");
    expect(m).toContain("data inicial da vigência");
  });
  it("sem tratamento de dados exige a justificativa", () => {
    expect(missingContractFields({ ...base, document: { ...base.document, dataProcessing: false } })).toEqual(["justificativa do Anexo II"]);
    expect(missingContractFields({ ...base, document: { ...base.document, dataProcessing: false, dataJustification: "só dados de empresas" } })).toEqual([]);
  });
});

describe("contractBlocks", () => {
  it("monta as 11 cláusulas, dois anexos, partes e parcelas com total", () => {
    const blocks = contractBlocks(base);
    const h3 = blocks.filter((b) => b.kind === "h3").map((b) => (b as { text: string }).text);
    expect(h3.filter((t) => /^\d+\. /.test(t))).toHaveLength(11);
    expect(blocks.filter((b) => b.kind === "pagebreak")).toHaveLength(2);
    const text = JSON.stringify(blocks);
    expect(text).toContain("Construtora Horizonte S.A.");
    expect(text).toContain("12.345.678/0001-90");
    expect(text).toContain("PROP-26-007 v2, aceita em 03/10/2026");
    expect(text).toContain("01/11/2026");
    expect(text).not.toContain("[FORO]");
    const price = blocks.find((b) => b.kind === "table" && b.columns[0] === "Marco / parcela") as { rows: string[][] };
    expect(price.rows).toHaveLength(3);
    expect(price.rows[2][0]).toBe("Total");
    expect(price.rows[2][1]).toMatch(/48\.500,00/);
  });
  it("campos vazios saem entre colchetes e o Anexo II vira justificativa quando não há dados", () => {
    const blocks = contractBlocks({ ...base, document: { ...emptyContractDocument(), dataProcessing: false } });
    const text = JSON.stringify(blocks);
    expect(text).toContain("[DESCRICAO_DO_PROJETO]");
    expect(text).toContain("[DATA_INICIAL]");
    expect(text).toContain("[JUSTIFICATIVA]");
    expect(text).not.toContain("Instruções e cooperação");
  });
});

describe("contractFromProposal", () => {
  const legal = { foro: "Campinas/SP", representante: "Eugênio" };
  it("puxa objeto, Anexo I, entregas e investimento da proposta", () => {
    const doc = contractFromProposal({
      title: "Integração do ERP",
      valueCents: 500_000,
      document: { ...emptyDocument(), projectName: "ERP + portal", objective: "Zerar retrabalho", scopeLimits: "Sem app mobile", assumptions: "Acesso ao ERP", deliverables: [{ title: "Conector", acceptance: "Sincroniza", due: "S4" }], investment: [{ item: "Fase 1", amountCents: 200_000, condition: "assinatura" }, { item: "Fase 2", amountCents: 300_000, condition: "entrega" }], paymentTerms: "Boleto 10 dias", technology: "Cessão após pagamento", continuity: "Garantia 60 dias", place: "Campinas" },
      contact: { name: "Marina", email: "marina@x.com" },
      invoices: [],
      legal,
    });
    expect(doc.projectDescription).toBe("ERP + portal");
    expect(doc.clientManager).toBe("Marina");
    expect(doc.clientEmail).toBe("marina@x.com");
    expect(doc.venue).toBe("Campinas/SP");
    expect(doc.place).toBe("Campinas");
    expect(doc.included).toContain("Entender: Levantamento");
    expect(doc.excluded).toBe("Sem app mobile");
    expect(doc.deliverables).toEqual([{ title: "Conector", acceptance: "Sincroniza", due: "S4" }]);
    expect(doc.installments).toEqual([{ milestone: "Fase 1", amountCents: 200_000, condition: "assinatura" }, { milestone: "Fase 2", amountCents: 300_000, condition: "entrega" }]);
    expect(doc.billing).toBe("Boleto 10 dias");
    expect(doc.ipRegime).toBe("Cessão após pagamento");
    expect(doc.warranty).toBe("Garantia 60 dias");
    expect(doc.dataRows.map((r) => r.dimension)).toEqual([...DATA_DIMENSIONS]);
  });
  it("parcelas do projeto têm prioridade; sem nada, parcela única com o valor", () => {
    const withInvoices = contractFromProposal({ title: "T", valueCents: 100, document: emptyDocument(), contact: null, invoices: [{ description: "Entrada", amountCents: 40, dueAt: "2026-11-10" }, { description: "Final", amountCents: 60, dueAt: "2026-12-10" }], legal });
    expect(withInvoices.installments).toEqual([{ milestone: "Entrada", amountCents: 40, condition: "vencimento 10/11/2026" }, { milestone: "Final", amountCents: 60, condition: "vencimento 10/12/2026" }]);
    const bare = contractFromProposal({ title: "T", valueCents: 100, document: emptyDocument(), contact: null, invoices: [], legal });
    expect(bare.installments).toEqual([{ milestone: "Parcela única", amountCents: 100, condition: "na assinatura" }]);
    expect(bare.projectDescription).toBe("T");
    expect(bare.egdManager).toBe("Eugênio");
  });
});

describe("parseStoredContractDocument / formatContractNumber", () => {
  it("jsonb vazio ou inválido volta ao padrão com as dimensões do Anexo II", () => {
    expect(parseStoredContractDocument({}).dataRows).toHaveLength(9);
    expect(parseStoredContractDocument({ deliverables: "x" }).acceptanceDays).toBe("5");
    expect(parseStoredContractDocument({ venue: "Rio/RJ" }).venue).toBe("Rio/RJ");
  });
  it("CT-AA-NNN", () => {
    expect(formatContractNumber(2026, 1)).toBe("CT-26-001");
    expect(formatContractNumber(2099, 1234)).toBe("CT-99-1234");
  });
});
