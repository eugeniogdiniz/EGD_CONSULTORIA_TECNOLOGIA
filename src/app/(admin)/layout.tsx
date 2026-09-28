import { requireAdmin } from "@/modules/auth/context";
import { countNewLeads } from "@/modules/leads/queries";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireAdmin();
  const novos = await countNewLeads();
  const nav = [
    { href: "/admin", label: "Painel" },
    { href: "/admin/organizacoes", label: "Organizações" },
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
