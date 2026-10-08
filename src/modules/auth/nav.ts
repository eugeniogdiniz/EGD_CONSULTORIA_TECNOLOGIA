import type { NavEntry } from "@/components/shell/sidebar";

/**
 * Menu do admin por papel, em grupos por área (Comercial, Operação, Financeiro,
 * Clientes, Relatórios, Site, Sistema). Colaborador vê a operação; o dono vê
 * tudo. Pura: testada em unidade. O que não está no menu também responde 404
 * (requireOwner).
 */
export function navFor(role: "admin" | "collaborator", badges: { leads: number; requests: number }): NavEntry[] {
  const owner = role === "admin";
  const nav: NavEntry[] = [{ href: "/admin", label: "Painel" }];
  if (owner) {
    nav.push({
      label: "Comercial",
      storageKey: "comercial",
      // Contatos vivem dentro da empresa (e na busca); Previsão é relatório; o catálogo de serviços é configuração.
      items: [
        { href: "/admin/leads", label: "Leads", badge: badges.leads },
        { href: "/admin/crm/funil", label: "Funil" },
        { href: "/admin/crm/empresas", label: "Empresas" },
        { href: "/admin/crm/propostas", label: "Propostas" },
        { href: "/admin/crm/contratos", label: "Contratos" },
      ],
    });
  }
  nav.push({
    label: "Operação",
    storageKey: "operacao",
    items: [
      { href: "/admin/projetos", label: "Projetos" },
      { href: "/admin/demandas", label: "Demandas" },
      { href: "/admin/atas", label: "Atas" },
      { href: "/admin/solicitacoes", label: "Solicitações", badge: badges.requests },
      { href: "/admin/projetos/templates", label: "Templates" },
    ],
  });
  if (owner) {
    nav.push(
      {
        label: "Financeiro",
        storageKey: "financeiro",
        items: [
          { href: "/admin/financeiro/receber", label: "Contas a receber" },
          { href: "/admin/financeiro/pagar", label: "Contas a pagar" },
          { href: "/admin/relatorios/horas", label: "Horas" },
        ],
      },
      {
        label: "Clientes",
        storageKey: "clientes",
        items: [
          { href: "/admin/organizacoes", label: "Organizações" },
          { href: "/admin/arquivos", label: "Arquivos" },
        ],
      },
      {
        label: "Relatórios",
        storageKey: "relatorios",
        items: [
          { href: "/admin/relatorios", label: "Portfólio" },
          { href: "/admin/relatorios/semanal", label: "Semanal" },
          { href: "/admin/crm/previsao", label: "Previsão" },
        ],
      },
      { label: "Site", storageKey: "site", items: [{ href: "/admin/cases", label: "Cases" }] },
      {
        label: "Sistema",
        storageKey: "sistema",
        items: [
          { href: "/admin/equipe", label: "Equipe" },
          { href: "/admin/crm/servicos", label: "Catálogo de serviços" },
          { href: "/admin/api", label: "API" },
          { href: "/admin/automacoes", label: "Automações" },
          { href: "/admin/auditoria", label: "Auditoria" },
          { href: "/admin/erros", label: "Erros" },
          { href: "/admin/configuracoes", label: "Configurações" },
        ],
      },
    );
  } else {
    nav.push({ href: "/admin/relatorios/semanal", label: "Semanal" });
  }
  return nav;
}
