import { describe, it, expect } from "vitest";
import { navFor } from "@/modules/auth/nav";

const flat = (role: "admin" | "collaborator") =>
  navFor(role, { leads: 2, requests: 3 }).flatMap((e) => ("items" in e ? e.items : [e]));
const hrefs = (role: "admin" | "collaborator") => flat(role).map((i) => i.href);
const groups = (role: "admin" | "collaborator") => navFor(role, { leads: 2, requests: 3 }).filter((e) => "items" in e).map((e) => e.label);

describe("navFor", () => {
  it("colaborador vê a operação e nada de comercial, financeiro, chaves ou auditoria", () => {
    const h = hrefs("collaborator");
    for (const ok of ["/admin", "/admin/demandas", "/admin/projetos", "/admin/atas", "/admin/solicitacoes", "/admin/relatorios/semanal", "/admin/projetos/templates"]) expect(h).toContain(ok);
    for (const no of ["/admin/crm/empresas", "/admin/organizacoes", "/admin/equipe", "/admin/leads", "/admin/cases", "/admin/arquivos", "/admin/api", "/admin/automacoes", "/admin/auditoria", "/admin/configuracoes", "/admin/relatorios", "/admin/financeiro/receber", "/admin/financeiro/pagar"]) expect(h).not.toContain(no);
    expect(groups("collaborator")).toEqual(["Operação"]);
  });
  it("dono vê tudo em grupos por área, com os selos de leads e solicitações", () => {
    const h = hrefs("admin");
    for (const ok of ["/admin/crm/propostas", "/admin/crm/servicos", "/admin/crm/previsao", "/admin/equipe", "/admin/configuracoes", "/admin/relatorios", "/admin/auditoria", "/admin/financeiro/receber", "/admin/financeiro/pagar", "/admin/relatorios/horas"]) expect(h).toContain(ok);
    expect(groups("admin")).toEqual(["Comercial", "Operação", "Financeiro", "Clientes", "Relatórios", "Site", "Sistema"]);
    expect(flat("admin").find((i) => i.href === "/admin/leads")).toMatchObject({ badge: 2 });
    expect(flat("admin").find((i) => i.href === "/admin/solicitacoes")).toMatchObject({ badge: 3 });
  });
  it("Comercial enxuto: Contatos fora do menu, Previsão em Relatórios e o catálogo em Sistema", () => {
    const nav = navFor("admin", { leads: 0, requests: 0 });
    const group = (label: string) => nav.find((e) => "items" in e && e.label === label) as { items: { href: string }[] };
    expect(group("Comercial").items.map((i) => i.href)).toEqual(["/admin/leads", "/admin/crm/funil", "/admin/crm/empresas", "/admin/crm/propostas", "/admin/crm/contratos"]);
    expect(group("Relatórios").items.map((i) => i.href)).toContain("/admin/crm/previsao");
    expect(group("Sistema").items.map((i) => i.href)).toContain("/admin/crm/servicos");
    expect(hrefs("admin")).not.toContain("/admin/crm/contatos");
  });
  it("nenhum href aparece duas vezes", () => {
    const h = hrefs("admin");
    expect(new Set(h).size).toBe(h.length);
  });
});
