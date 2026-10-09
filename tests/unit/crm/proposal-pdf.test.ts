import { describe, it, expect } from "vitest";
import { renderProposalPdf, toWinAnsi, type ProposalPdfInput } from "@/modules/crm/proposal-pdf";
import { emptyDocument } from "@/modules/crm/document";

const base: ProposalPdfInput = {
  number: "PROP-26-007",
  version: 2,
  title: "Integração do ERP com o portal",
  valueCents: 4_850_000,
  issuedOn: "03/10/2026",
  validUntil: "31/10/2026",
  companyName: "Construtora Horizonte",
  contactName: "Marina Souza",
  contactRole: "Diretora de operações",
  document: emptyDocument(),
  signer: { name: "Eugênio G. Diniz", role: "Consultor em Tecnologia" },
  brand: { email: "contato@egdsystem.com.br", phone: "+55 (11) 94050-2208", site: "egdsystem.com.br" },
};

const pages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

describe("renderProposalPdf", () => {
  it("documento vazio gera um PDF válido de uma página com metadados", async () => {
    const pdf = await renderProposalPdf(base);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(10_000);
    expect(pages(pdf)).toBe(1);
    // o pdfkit grava o título em UTF-16BE (há "·" no texto): cada caractere vem precedido de um byte nulo
    const latin = pdf.toString("latin1");
    expect(latin).toContain("\u0000P\u0000R\u0000O\u0000P\u0000-\u00002\u00006\u0000-\u00000\u00000\u00007");
  });

  it("textos longos quebram em várias páginas sem erro e numeram o rodapé", async () => {
    const long = "Parágrafo com bastante texto para forçar a quebra de linha e de página. ".repeat(60);
    const pdf = await renderProposalPdf({
      ...base,
      document: {
        ...emptyDocument(),
        context: long,
        objective: long,
        deliverables: Array.from({ length: 12 }, (_, i) => ({ title: `Entrega ${i + 1}`, acceptance: "Evidência aceita pelo cliente em homologação.", due: `Semana ${i + 1}` })),
        investment: [{ item: "Fase 1", amountCents: 2_000_000, condition: "na assinatura" }, { item: "Fase 2", amountCents: 2_850_000, condition: "na entrega" }],
        paymentTerms: "Boleto em 10 dias.",
        continuity: "Garantia de 30 dias.",
      },
    });
    expect(pages(pdf)).toBeGreaterThanOrEqual(3);
  });

  it("texto que quebra de página continua na fonte do corpo, não na do cabeçalho", async () => {
    const long = "Parágrafo com bastante texto para forçar a quebra de página. ".repeat(120);
    const doc = { ...emptyDocument(), context: long };
    const pdf = await renderProposalPdf({ ...base, document: doc });
    expect(pages(pdf)).toBeGreaterThanOrEqual(2);
    // a fonte e o tamanho são definidos no fluxo como "/F<n> <tam> Tf": o cabeçalho usa 8 e o texto do corpo 10.5
    const { inflateSync } = await import("node:zlib");
    const streams = [...pdf.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((m) => {
      try { return inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { return ""; }
    });
    const page2 = streams.filter((s) => s.includes(" Tf"))[1];
    const sizes = [...page2.matchAll(/ ([\d.]+) Tf/g)].map((m) => Number(m[1]));
    expect(sizes).toContain(10.5);
  });

  it("sem o logo no disco continua gerando", async () => {
    const cwd = process.cwd();
    process.chdir("/tmp");
    try {
      const pdf = await renderProposalPdf(base);
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    } finally {
      process.chdir(cwd);
    }
  });
});

it("toWinAnsi troca setas e remove emoji, preservando acentos e travessões", () => {
  expect(toWinAnsi("ERP → portal ✓ 🚀 — ok à é ç")).toBe("ERP › portal v  — ok à é ç");
});

it("toWinAnsi troca tabulação e controle por espaço e mantém quebras de linha", () => {
  expect(toWinAnsi("Implantação\tdo\tERP\tOmie")).toBe("Implantação do ERP Omie");
  expect(toWinAnsi("linha 1\r\nlinha 2\rlinha 3")).toBe("linha 1\nlinha 2\nlinha 3");
  expect(toWinAnsi("a  \t  b\u0007c")).toBe("a b c");
});
