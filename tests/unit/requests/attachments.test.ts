import { describe, it, expect } from "vitest";
import { extensionOf, validateAttachments, MAX_FILES } from "@/modules/requests/attachments";

const f = (name: string, size = 1000) => ({ name, size });

describe("validateAttachments", () => {
  it("aceita lista vazia e tipos permitidos", () => {
    expect(validateAttachments([])).toBeNull();
    expect(validateAttachments([f("print.PNG"), f("planilha.xlsx"), f("doc.pdf")])).toBeNull();
  });
  it("recusa mais de 5, mais de 50 MB, vazio, tipo proibido e nome com caminho", () => {
    expect(validateAttachments(Array.from({ length: MAX_FILES + 1 }, (_, i) => f(`a${i}.pdf`)))).toMatch(/No máximo 5/);
    expect(validateAttachments([f("a.pdf", 30 * 1024 * 1024), f("b.pdf", 21 * 1024 * 1024)])).toMatch(/50 MB/);
    expect(validateAttachments([f("vazio.pdf", 0)])).toMatch(/vazio/);
    expect(validateAttachments([f("virus.exe")])).toMatch(/não permitido/);
    expect(validateAttachments([f("sem-extensao")])).toMatch(/não permitido/);
    expect(validateAttachments([f("../../etc/passwd.txt")])).toBeNull();
  });
  it("extensão em minúsculas, sem caminho", () => {
    expect(extensionOf("A/B/Relatório.PDF")).toBe("pdf");
    expect(extensionOf(".bashrc")).toBe("");
    expect(extensionOf("arquivo.")).toBe("");
  });
});
