import { requireAdmin } from "@/modules/auth/context";
import { countNewLeads } from "@/modules/leads/queries";
import { AppShell } from "@/components/shell/app-shell";
import type { NavEntry } from "@/components/shell/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireAdmin();
  const novos = await countNewLeads();
  const nav: NavEntry[] = [
    { href: "/admin", label: "Painel" },
    {
      label: "CRM",
      storageKey: "crm",
      items: [
        { href: "/admin/crm/empresas", label: "Empresas" },
        { href: "/admin/crm/contatos", label: "Contatos" },
        { href: "/admin/crm/funil", label: "Funil" },
        { href: "/admin/crm/propostas", label: "Propostas" },
      ],
    },
    { href: "/admin/organizacoes", label: "Organizações" },
    { href: "/admin/projetos", label: "Projetos" },
    { href: "/admin/projetos/templates", label: "Templates" },
    { href: "/admin/cases", label: "Cases" },
    { href: "/admin/leads", label: "Leads", badge: novos },
    { href: "/admin/arquivos", label: "Arquivos" },
    { href: "/admin/auditoria", label: "Auditoria" },
  ];
  return (
    <AppShell nav={nav} footer="Portal administrativo" user={ctx.user} accountHref="/admin/conta" title="EGD">
      {children}
    </AppShell>
  );
}
