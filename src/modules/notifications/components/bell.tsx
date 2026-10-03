import { getBellData } from "@/modules/notifications/queries";
import { markAllReadAdminForm, markAllReadPortalForm } from "@/modules/notifications/form-actions";
import { NotificationBell } from "./notification-bell";

/** Sino com dados do servidor, para os layouts do admin e do portal. */
export async function Bell({ userId, area }: { userId: string; area: "admin" | "portal" }) {
  const { unread, recent } = await getBellData(userId);
  return (
    <NotificationBell
      area={area}
      unread={unread}
      now={new Date().toISOString()}
      items={recent.map((n) => ({ id: n.id, title: n.title, body: n.body, read: n.readAt !== null, createdAt: n.createdAt.toISOString() }))}
      markAllRead={area === "admin" ? markAllReadAdminForm : markAllReadPortalForm}
    />
  );
}
