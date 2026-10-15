import { describe, it, expect } from "vitest";
import { DEFAULT_FOLDERS, defaultFolderRows, titleFromFilename } from "@/modules/project-documents/folders";

describe("pastas padrão", () => {
  it("cobre proposta, contrato, administrativo e entregas, nessa ordem de posição", () => {
    const rows = defaultFolderRows("p1");
    expect(rows.map((r) => r.systemKey)).toEqual(["proposta", "contrato", "administrativo", "financeiro", "tecnico", "entregas"]);
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(rows.every((r) => r.projectId === "p1")).toBe(true);
  });

  it("administrativo, financeiro e técnico nascem internos", () => {
    const internal = DEFAULT_FOLDERS.filter((f) => !f.visibleToClient).map((f) => f.systemKey);
    expect(internal).toEqual(["administrativo", "financeiro", "tecnico"]);
  });
});

describe("titleFromFilename", () => {
  it("tira a extensão e o caminho", () => {
    expect(titleFromFilename("ART assinada.pdf")).toBe("ART assinada");
    expect(titleFromFilename("C:\\docs\\memorial.v2.docx")).toBe("memorial.v2");
    expect(titleFromFilename("pasta/planilha.xlsx")).toBe("planilha");
  });

  it("mantém nomes sem extensão e arquivos ocultos", () => {
    expect(titleFromFilename("LEIAME")).toBe("LEIAME");
    expect(titleFromFilename(".env")).toBe(".env");
  });

  it("limita a 200 caracteres", () => {
    expect(titleFromFilename(`${"a".repeat(300)}.pdf`)).toHaveLength(200);
  });
});
