import { describe, it, expect } from "vitest";
import { activeHref, shouldGroupBeOpen } from "@/components/shell/sidebar";

const hrefs = ["/admin/crm/empresas", "/admin/crm/contatos", "/admin/crm/funil", "/admin/crm/propostas"];

describe("shouldGroupBeOpen", () => {
  it("sub-item ativo por match exato força aberto, mesmo com storage 'closed'", () => {
    expect(shouldGroupBeOpen("/admin/crm/funil", hrefs, "closed")).toBe(true);
  });
  it("sub-item ativo por prefixo (rota filha) força aberto", () => {
    expect(shouldGroupBeOpen("/admin/crm/empresas/abc-123", hrefs, "closed")).toBe(true);
  });
  it("sem sub-item ativo e sem storage: aberto (o menu inteiro é de grupos)", () => {
    expect(shouldGroupBeOpen("/admin", hrefs, null)).toBe(true);
  });
  it("storage 'open' abre quando não há sub-item ativo", () => {
    expect(shouldGroupBeOpen("/admin", hrefs, "open")).toBe(true);
  });
  it("storage 'closed' fecha quando não há sub-item ativo", () => {
    expect(shouldGroupBeOpen("/admin/leads", hrefs, "closed")).toBe(false);
  });
  it("prefixo bate com barra: /admin/crm/empresa não deve reabrir se só /admin/crm/empresas foi listado", () => {
    expect(shouldGroupBeOpen("/admin/crm/empresas", hrefs, "closed")).toBe(true);
    expect(shouldGroupBeOpen("/admin/crm/empresass-outra", hrefs, "closed")).toBe(false);
  });
});

describe("activeHref", () => {
  const all = ["/admin", "/admin/projetos", "/admin/projetos/templates", "/admin/relatorios", "/admin/relatorios/semanal", "/admin/relatorios/horas", "/admin/financeiro/receber"];
  it("a raiz só é ativa na própria rota", () => {
    expect(activeHref("/admin", all, "/admin")).toBe("/admin");
    expect(activeHref("/admin/projetos", all, "/admin")).toBe("/admin/projetos");
  });
  it("entre Projetos e Templates vence o mais específico", () => {
    expect(activeHref("/admin/projetos/templates", all, "/admin")).toBe("/admin/projetos/templates");
    expect(activeHref("/admin/projetos/templates/abc", all, "/admin")).toBe("/admin/projetos/templates");
    expect(activeHref("/admin/projetos/abc/financeiro", all, "/admin")).toBe("/admin/projetos");
  });
  it("Horas (dentro de /admin/relatorios) ativa só o item Horas, não Portfólio", () => {
    expect(activeHref("/admin/relatorios/horas", all, "/admin")).toBe("/admin/relatorios/horas");
    expect(activeHref("/admin/relatorios", all, "/admin")).toBe("/admin/relatorios");
  });
  it("rota fora do menu não ativa nada", () => {
    expect(activeHref("/admin/busca", all, "/admin")).toBeNull();
  });
});
