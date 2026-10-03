import { requireAdmin } from "@/modules/auth/context";
import { countUnread, listNotifications } from "@/modules/notifications/queries";
import { markAllReadAdminForm } from "@/modules/notifications/form-actions";
import { NotificationList } from "@/modules/notifications/components/notification-list";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Notificações" };

export default async function AdminNotificacoesPage({ searchParams }: PageProps<"/admin/notificacoes">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const unreadOnly = sp.filtro === "nao-lidas";
  const [items, unread] = await Promise.all([listNotifications(ctx.user.id, { unreadOnly, limit: 50 }), countUnread(ctx.user.id)]);
  return (
    <>
      <PageHeader title="Notificações" meta="O que aconteceu com clientes, solicitações, leads e propostas. Clique para abrir o item." />
      <NotificationList area="admin" items={items} unreadOnly={unreadOnly} unread={unread} markAllRead={markAllReadAdminForm} />
    </>
  );
}
