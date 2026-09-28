import { describe, it, expect } from "vitest";
import {
  PUBLIC_EMAIL_DOMAINS,
  buildDefaultOpportunityTitle,
  extractEmailDomain,
  isPublicEmailDomain,
} from "@/modules/crm/convert-lead";

describe("extractEmailDomain", () => {
  it("normaliza (trim + lowercase) antes de extrair", () => {
    expect(extractEmailDomain("  Joao@Acme.COM ")).toBe("acme.com");
  });
  it("aceita subdomínios", () => {
    expect(extractEmailDomain("ceo@mail.empresa.co.br")).toBe("mail.empresa.co.br");
  });
  it("devolve null para valor vazio, null, undefined ou sem @", () => {
    expect(extractEmailDomain("")).toBeNull();
    expect(extractEmailDomain(null)).toBeNull();
    expect(extractEmailDomain(undefined)).toBeNull();
    expect(extractEmailDomain("semarrobaaqui")).toBeNull();
  });
  it("devolve null para @ mal posicionado", () => {
    expect(extractEmailDomain("@empresa.com")).toBeNull();
    expect(extractEmailDomain("nome@")).toBeNull();
  });
  it("devolve null para domínio sem TLD (a checagem final é do Zod, mas aqui filtra grosseiro)", () => {
    expect(extractEmailDomain("nome@localhost")).toBeNull();
  });
});

describe("isPublicEmailDomain", () => {
  it("reconhece os principais provedores", () => {
    expect(isPublicEmailDomain("gmail.com")).toBe(true);
    expect(isPublicEmailDomain("outlook.com.br")).toBe(true);
    expect(isPublicEmailDomain("proton.me")).toBe(true);
    expect(isPublicEmailDomain("uol.com.br")).toBe(true);
  });
  it("case-insensitive", () => {
    expect(isPublicEmailDomain("Gmail.COM")).toBe(true);
  });
  it("nega domínios corporativos", () => {
    expect(isPublicEmailDomain("acme.com")).toBe(false);
    expect(isPublicEmailDomain("urbhis.com.br")).toBe(false);
  });
  it("lista tem no mínimo 20 entradas", () => {
    expect(PUBLIC_EMAIL_DOMAINS.size).toBeGreaterThanOrEqual(20);
  });
});

describe("buildDefaultOpportunityTitle", () => {
  it("monta com o nome do lead", () => {
    expect(buildDefaultOpportunityTitle("Ana Ribeiro")).toBe("Contato pelo site — Ana Ribeiro");
  });
  it("colapsa espaços internos", () => {
    expect(buildDefaultOpportunityTitle("  Ana   Ribeiro  ")).toBe("Contato pelo site — Ana Ribeiro");
  });
  it("sem nome, deixa apenas o prefixo", () => {
    expect(buildDefaultOpportunityTitle("")).toBe("Contato pelo site");
    expect(buildDefaultOpportunityTitle("   ")).toBe("Contato pelo site");
  });
});
