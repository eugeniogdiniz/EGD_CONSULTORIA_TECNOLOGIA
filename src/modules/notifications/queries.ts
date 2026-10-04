import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notification, notificationPreference } from "@/db/schema";
import { isKind, type KindKey } from "./kinds";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  url: string;
  readAt: Date | null;
  createdAt: Date;
};

const columns = {
  id: notification.id,
  kind: notification.kind,
  title: notification.title,
  body: notification.body,
  url: notification.url,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
};

export async function countUnread(userId: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return r?.n ?? 0;
}

/** As mais recentes de uma pessoa (sino ou página). */
export function listNotifications(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}): Promise<NotificationRow[]> {
  return db
    .select(columns)
    .from(notification)
    .where(and(eq(notification.userId, userId), opts.unreadOnly ? isNull(notification.readAt) : undefined))
    .orderBy(desc(notification.createdAt))
    .limit(opts.limit ?? 50);
}

/** Dados do sino numa chamada só. */
export async function getBellData(userId: string) {
  const [unread, recent] = await Promise.all([countUnread(userId), listNotifications(userId, { limit: 8 })]);
  return { unread, recent };
}

/** Preferências gravadas da pessoa (tipo → e-mail ligado?). Tipos sem linha = ligado. */
export async function listPreferences(userId: string): Promise<Partial<Record<KindKey, boolean>>> {
  const rows = await db
    .select({ kind: notificationPreference.kind, email: notificationPreference.email })
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, userId));
  const out: Partial<Record<KindKey, boolean>> = {};
  for (const r of rows) if (isKind(r.kind)) out[r.kind] = r.email;
  return out;
}
