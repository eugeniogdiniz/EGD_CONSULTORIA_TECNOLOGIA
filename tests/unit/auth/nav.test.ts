import { describe, it, expect } from "vitest";
import { navFor } from "@/modules/auth/nav";

const hrefs = (role: "admin" | "collaborator") =>
  navFor(role, { leads: 2, requests: 3 }).flatMap((e) => ("items" in e ? e.items.map((i) => i.href) : [e.href]));

describe("navFor", () => {
  it("colaborador vê a operação e nada de comercial, financeiro, chaves ou auditoria", () => {
    const h = hrefs("collaborator");
    for (const ok of ["/admin", "/admin/demandas", "/admin/projetos", "/admin/atas", "/admin/solicitacoes", "/admin/relatorios/semanal", "/admin/projetos/templates"]) expect(h).toContain(ok);
    for (const no of ["/admin/crm/empresas", "/admin/organizacoes", "/admin/equipe", "/admin/leads", "/admin/cases", "/admin/arquivos", "/admin/api", "/admin/automacoes", "/admin/auditoria", "/admin/configuracoes", "/admin/relatorios"]) expect(h).not.toContain(no);
  });
  it("dono vê tudo, com Equipe e Configurações, e os selos de leads e solicitações", () => {
    const nav = navFor("admin", { leads: 2, requests: 3 });
    const h = hrefs("admin");
    for (const ok of ["/admin/crm/propostas", "/admin/equipe", "/admin/configuracoes", "/admin/relatorios", "/admin/auditoria"]) expect(h).toContain(ok);
    expect(nav.find((e) => "href" in e && e.href === "/admin/leads")).toMatchObject({ badge: 2 });
    expect(nav.find((e) => "href" in e && e.href === "/admin/solicitacoes")).toMatchObject({ badge: 3 });
  });
});
