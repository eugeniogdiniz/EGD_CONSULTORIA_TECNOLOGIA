import type { NavEntry } from "@/components/shell/sidebar";

/**
 * Menu do admin por papel. Colaborador vê a operação; o dono vê tudo. Pura:
 * testada em unidade. O que não está no menu também responde 404 (requireOwner).
 */
export function navFor(role: "admin" | "collaborator", badges: { leads: number; requests: number }): NavEntry[] {
  const owner = role === "admin";
  const nav: NavEntry[] = [{ href: "/admin", label: "Painel" }];
  if (owner) {
    nav.push({
      label: "CRM",
      storageKey: "crm",
      items: [
        { href: "/admin/crm/empresas", label: "Empresas" },
        { href: "/admin/crm/contatos", label: "Contatos" },
        { href: "/admin/crm/funil", label: "Funil" },
        { href: "/admin/crm/propostas", label: "Propostas" },
      ],
    });
    nav.push({ href: "/admin/organizacoes", label: "Organizações" }, { href: "/admin/equipe", label: "Equipe" });
  }
  nav.push({ href: "/admin/demandas", label: "Demandas" }, { href: "/admin/projetos", label: "Projetos" }, { href: "/admin/atas", label: "Atas" });
  nav.push(owner ? { href: "/admin/relatorios", label: "Relatórios" } : { href: "/admin/relatorios/semanal", label: "Semanal" });
  nav.push({ href: "/admin/projetos/templates", label: "Templates" });
  if (owner) nav.push({ href: "/admin/cases", label: "Cases" });
  nav.push({ href: "/admin/solicitacoes", label: "Solicitações", badge: badges.requests });
  if (owner) {
    nav.push(
      { href: "/admin/leads", label: "Leads", badge: badges.leads },
      { href: "/admin/arquivos", label: "Arquivos" },
      { href: "/admin/api", label: "API" },
      { href: "/admin/automacoes", label: "Automações" },
      { href: "/admin/auditoria", label: "Auditoria" },
      { href: "/admin/configuracoes", label: "Configurações" },
    );
  }
  return nav;
}
