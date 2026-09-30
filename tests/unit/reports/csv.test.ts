import { describe, it, expect } from "vitest";
import { csvCents, csvDecimal, csvResponse, reportFilename, toCsv } from "@/modules/reports/csv";

const BOM = "﻿";

describe("csv", () => {
  it("BOM, ponto e vírgula e CRLF", () => {
    expect(toCsv(["a", "b"], [["1", 2]])).toBe(`${BOM}a;b\r\n1;2\r\n`);
  });

  it("escapa ; aspas e quebra de linha; null vira vazio", () => {
    const out = toCsv(["t"], [['Rede; "bloco B"\nfase 2'], [null]]);
    expect(out).toBe(`${BOM}t\r\n"Rede; ""bloco B""\nfase 2"\r\n\r\n`);
  });

  it("neutraliza fórmula no início da célula de texto, mas não número negativo", () => {
    expect(toCsv(["t"], [["=HYPERLINK(1)"], [-3]])).toBe(`${BOM}t\r\n'=HYPERLINK(1)\r\n-3\r\n`);
  });

  it("neutraliza fórmula escondida atrás de tabulação ou CR", () => {
    expect(toCsv(["t"], [["\t=HYPERLINK(1)"]])).toBe(`${BOM}t\r\n'\t=HYPERLINK(1)\r\n`);
    expect(toCsv(["t"], [["\r=1+1"]])).toBe(`${BOM}t\r\n"'\r=1+1"\r\n`);
  });

  it("decimais e reais com vírgula", () => {
    expect(csvDecimal(86.5, 1)).toBe("86,5");
    expect(csvDecimal(2, 2)).toBe("2,00");
    expect(csvCents(1297500)).toBe("12975,00");
    expect(csvCents(null)).toBe("");
  });

  it("nome do arquivo", () => {
    expect(reportFilename("laudo-infra", "2026-09-30")).toBe("relatorio-laudo-infra-2026-09-30.csv");
  });

  it("resposta HTTP para download", async () => {
    const res = csvResponse("r.csv", "x");
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="r.csv"');
    expect(await res.text()).toBe("x");
  });
});
