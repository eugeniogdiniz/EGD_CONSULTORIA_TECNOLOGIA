import { it, expect } from "vitest";
import { sanitizeFilename, buildBucketKey, MAX_FILE_BYTES } from "@/modules/files/keys";

it("remove path traversal e caracteres não seguros", () => {
  expect(sanitizeFilename("../../etc/passwd")).toBe("etc-passwd");
  expect(sanitizeFilename("..\\..\\windows\\system.ini")).toBe("windows-system.ini");
});

it("normaliza acentos, espaços e mantém extensão em minúsculas", () => {
  expect(sanitizeFilename("Relatório Final ç.PDF")).toBe("relatorio-final-c.pdf");
});

it("trunca nomes longos preservando a extensão", () => {
  const out = sanitizeFilename("a".repeat(300) + ".xlsx");
  expect(out.length).toBeLessThanOrEqual(120);
  expect(out.endsWith(".xlsx")).toBe(true);
});

it("nome vazio ou só símbolos vira 'arquivo'", () => {
  expect(sanitizeFilename("")).toBe("arquivo");
  expect(sanitizeFilename("###")).toBe("arquivo");
  expect(sanitizeFilename(".env")).toBe("env");
});

it("chave por organização e chave interna", () => {
  expect(buildBucketKey({ organizationId: "org1", fileId: "f1", filename: "x.pdf" })).toBe("org/org1/f1-x.pdf");
  expect(buildBucketKey({ organizationId: null, fileId: "f1", filename: "x.pdf" })).toBe("internal/f1-x.pdf");
});

it("limite de tamanho é 50 MB", () => {
  expect(MAX_FILE_BYTES).toBe(50 * 1024 * 1024);
});
