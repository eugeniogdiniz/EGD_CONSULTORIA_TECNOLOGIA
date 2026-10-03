import { requireAdmin, isOwner } from "@/modules/auth/context";
import { countNewLeads } from "@/modules/leads/queries";
import { countActiveRequests } from "@/modules/requests/queries";
import { AppShell } from "@/components/shell/app-shell";
import { Bell } from "@/modules/notifications/components/bell";
import { navFor } from "@/modules/auth/nav";
import { SearchBox } from "@/components/shell/search-box";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  // Minha conta precisa abrir mesmo com 2FA obrigatório e desligado; as páginas aplicam a trava
  const ctx = await requireAdmin({ allowWithout2fa: true });
  const owner = isOwner(ctx);
  const [novos, solicitacoes] = await Promise.all([owner ? countNewLeads() : Promise.resolve(0), countActiveRequests()]);
  const nav = navFor(ctx.user.role, { leads: novos, requests: solicitacoes });
  return (
    <AppShell nav={nav} footer={owner ? "Portal administrativo" : "Equipe EGD"} user={ctx.user} accountHref="/admin/conta" title="EGD" topRight={<SearchBox />} bell={<Bell userId={ctx.user.id} area="admin" />}>
      {children}
    </AppShell>
  );
}
