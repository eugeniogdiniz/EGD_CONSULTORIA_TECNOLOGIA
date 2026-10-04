import { requirePortal } from "@/modules/auth/context";
import { countUnread, listNotifications } from "@/modules/notifications/queries";
import { markAllReadPortalForm } from "@/modules/notifications/form-actions";
import { NotificationList } from "@/modules/notifications/components/notification-list";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Notificações" };

export default async function PortalNotificacoesPage({ searchParams }: PageProps<"/portal/notificacoes">) {
  const ctx = await requirePortal();
  const sp = await searchParams;
  const unreadOnly = sp.filtro === "nao-lidas";
  const [items, unread] = await Promise.all([listNotifications(ctx.user.id, { unreadOnly, limit: 50 }), countUnread(ctx.user.id)]);
  return (
    <>
      <PageHeader title="Notificações" meta="Respostas, entregas e atas dos seus projetos. Clique para abrir o item." />
      <NotificationList area="portal" items={items} unreadOnly={unreadOnly} unread={unread} markAllRead={markAllReadPortalForm} />
    </>
  );
}
