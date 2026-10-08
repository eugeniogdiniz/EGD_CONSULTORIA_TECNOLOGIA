import { describe, it, expect } from "vitest";
import { renderDocPdf, type DocBlock } from "@/modules/crm/doc-pdf";
import { contractBlocks, type ContractRenderInput } from "@/modules/contracts/template";
import { acceptanceBlocks } from "@/modules/contracts/acceptance-template";
import { emptyContractDocument } from "@/modules/contracts/document";

const brand = { email: "contato@egdsystem.com.br", phone: "+55 (11) 94050-2208", site: "egdsystem.com.br" };
const pages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

describe("renderDocPdf", () => {
  it("renderiza todos os tipos de bloco num PDF válido", async () => {
    const blocks: DocBlock[] = [
      { kind: "kicker", text: "Documento" },
      { kind: "title", text: "Título ✓ com símbolo", subtitle: "Subtítulo" },
      { kind: "meta", text: "meta · 04/10/2026" },
      { kind: "h2", text: "Grupo" },
      { kind: "h3", text: "1. Cláusula" },
      { kind: "p", text: "Parágrafo." },
      { kind: "p", text: "Nota.", muted: true },
      { kind: "table", columns: ["A", "B"], rows: [["1", "2"], ["Total", "3"]] },
      { kind: "spacer" },
      { kind: "signatures", parties: [{ label: "Contratada", lines: ["X", "Y"] }, { label: "Contratante", lines: ["Z"] }] },
    ];
    const pdf = await renderDocPdf({ headerLabel: "Teste · 1", info: { title: "Teste" }, blocks, brand });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pages(pdf)).toBe(1);
  });

  it("tabela longa e quebras explícitas geram várias páginas com rodapé", async () => {
    const rows = Array.from({ length: 60 }, (_, i) => [`Linha ${i + 1}`, "Texto longo o bastante para ocupar duas linhas da célula e forçar altura variável. ".repeat(2)]);
    const pdf = await renderDocPdf({ headerLabel: "Teste", info: { title: "Teste" }, blocks: [{ kind: "table", columns: ["A", "B"], rows }, { kind: "pagebreak" }, { kind: "p", text: "fim" }], brand });
    expect(pages(pdf)).toBeGreaterThanOrEqual(4);
  });

  it("contrato completo e termo de aceite renderizam", async () => {
    const input: ContractRenderInput = {
      number: "CT-26-001",
      version: 1,
      issuedOn: "04/10/2026",
      proposal: { number: "PROP-26-001", version: 1, title: "Projeto", valueCents: 100_000, acceptedOn: null },
      parties: { egd: { razaoSocial: "", cnpj: "", endereco: "", representante: "", cargo: "" }, client: { name: "Cliente", legalName: "", cnpj: "", address: "", representativeName: "", representativeRole: "" } },
      document: emptyContractDocument(),
    };
    const contract = await renderDocPdf({ headerLabel: "Contrato", info: { title: "Contrato" }, blocks: contractBlocks(input), brand });
    expect(pages(contract)).toBeGreaterThanOrEqual(4);
    const term = await renderDocPdf({
      headerLabel: "Termo",
      info: { title: "Termo" },
      blocks: acceptanceBlocks({ contractNumber: "CT-26-001", projectTitle: "Projeto", client: { name: "Cliente", representative: null }, deliverable: { title: "Laudo", description: null, completedOn: "01/10/2026" }, approval: { name: "Maria", email: "m@x.com", at: "02/10/2026 10:00", notes: null, ipHash: "abcdef0123456789" }, reservations: "Ajustar a capa.", egd: { representante: "E", cargo: "C", razaoSocial: "EGD" }, place: "São Paulo", issuedOn: "04/10/2026", version: 1 }),
      brand,
    });
    expect(pages(term)).toBe(1);
    expect(term.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
