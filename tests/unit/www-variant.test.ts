import { describe, it, expect } from "vitest";
import { wwwVariant } from "@/lib/www-variant";

describe("wwwVariant", () => {
  it("acrescenta e tira o www", () => {
    expect(wwwVariant("https://egdsystem.com.br")).toEqual(["https://www.egdsystem.com.br"]);
    expect(wwwVariant("https://www.egdsystem.com.br")).toEqual(["https://egdsystem.com.br"]);
  });

  it("mantém protocolo e porta", () => {
    expect(wwwVariant("http://egd.test:8080")).toEqual(["http://www.egd.test:8080"]);
  });

  it("local, IP, vazio ou inválido não ganham par", () => {
    expect(wwwVariant("http://localhost:3000")).toEqual([]);
    expect(wwwVariant("http://127.0.0.1:3000")).toEqual([]);
    expect(wwwVariant(undefined)).toEqual([]);
    expect(wwwVariant("não é url")).toEqual([]);
  });
});
