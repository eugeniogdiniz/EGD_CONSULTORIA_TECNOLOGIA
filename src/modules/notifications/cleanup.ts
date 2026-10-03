/**
 * Retenção: lidas somem depois de 90 dias; não lidas, depois de 180.
 * Regra pura `retentionCutoffs(now)` para o teste; `deleteOldNotifications` aplica.
 */
import { and, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { notification } from "@/db/schema";

export const READ_RETENTION_DAYS = 90;
export const UNREAD_RETENTION_DAYS = 180;

export function retentionCutoffs(now: Date) {
  const day = 86_400_000;
  return { readBefore: new Date(now.getTime() - READ_RETENTION_DAYS * day), unreadBefore: new Date(now.getTime() - UNREAD_RETENTION_DAYS * day) };
}

export async function deleteOldNotifications(now: Date): Promise<{ deleted: number }> {
  const c = retentionCutoffs(now);
  const rows = await db
    .delete(notification)
    .where(
      or(
        and(isNotNull(notification.readAt), lt(notification.createdAt, c.readBefore)),
        and(isNull(notification.readAt), lt(notification.createdAt, c.unreadBefore)),
      ),
    )
    .returning({ id: notification.id });
  return { deleted: rows.length };
}

export async function countOldNotifications(now: Date): Promise<{ read: number; unread: number }> {
  const c = retentionCutoffs(now);
  const read = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(isNotNull(notification.readAt), lt(notification.createdAt, c.readBefore)));
  const unread = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(isNull(notification.readAt), lt(notification.createdAt, c.unreadBefore)));
  return { read: read.length, unread: unread.length };
}
