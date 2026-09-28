import { describe, it, expect } from "vitest";
import { shouldGroupBeOpen } from "@/components/shell/sidebar";

const hrefs = ["/admin/crm/empresas", "/admin/crm/contatos", "/admin/crm/funil", "/admin/crm/propostas"];

describe("shouldGroupBeOpen", () => {
  it("sub-item ativo por match exato força aberto, mesmo com storage 'closed'", () => {
    expect(shouldGroupBeOpen("/admin/crm/funil", hrefs, "closed")).toBe(true);
  });
  it("sub-item ativo por prefixo (rota filha) força aberto", () => {
    expect(shouldGroupBeOpen("/admin/crm/empresas/abc-123", hrefs, "closed")).toBe(true);
  });
  it("sem sub-item ativo e sem storage: fechado (default inicial)", () => {
    expect(shouldGroupBeOpen("/admin", hrefs, null)).toBe(false);
  });
  it("storage 'open' abre quando não há sub-item ativo", () => {
    expect(shouldGroupBeOpen("/admin", hrefs, "open")).toBe(true);
  });
  it("storage 'closed' fecha quando não há sub-item ativo", () => {
    expect(shouldGroupBeOpen("/admin/leads", hrefs, "closed")).toBe(false);
  });
  it("prefixo bate com barra: /admin/crm/empresa não deve reabrir se só /admin/crm/empresas foi listado", () => {
    // Aqui empresa (singular) não colide com empresas (plural); o startsWith usa `${h}/`.
    expect(shouldGroupBeOpen("/admin/crm/empresas", hrefs, "closed")).toBe(true);
    expect(shouldGroupBeOpen("/admin/crm/empresass-outra", hrefs, "closed")).toBe(false);
  });
});
