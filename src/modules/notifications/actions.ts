import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notification, notificationPreference } from "@/db/schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { getKind, isKind } from "./kinds";

type Ctx = AdminContext | PortalContext;

/** Marca lida e devolve a URL de destino. Só a própria pessoa; de outro usuário devolve null. */
export async function openNotification(ctx: Ctx, id: string): Promise<{ url: string } | null> {
  if (!isUuid(id)) return null;
  const [row] = await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.id, id), eq(notification.userId, ctx.user.id), isNull(notification.readAt)))
    .returning({ url: notification.url });
  if (row) return row;
  const existing = await db.query.notification.findFirst({
    where: and(eq(notification.id, id), eq(notification.userId, ctx.user.id)),
    columns: { url: true },
  });
  return existing ?? null;
}

export async function markAllRead(ctx: Ctx): Promise<ActionResult<{ marked: number }>> {
  const rows = await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, ctx.user.id), isNull(notification.readAt)))
    .returning({ id: notification.id });
  if (rows.length > 0) {
    await audit({ actorId: ctx.user.id, action: "notification.read_all", entityType: "user", entityId: ctx.user.id, metadata: { marked: rows.length } });
  }
  return ok({ marked: rows.length });
}

/** Liga/desliga o e-mail de um tipo para a própria pessoa. Só tipos do público dela. */
export async function setPreference(ctx: Ctx, kind: string, email: boolean): Promise<ActionResult<null>> {
  if (!isKind(kind)) return fail("Tipo de notificação inválido.");
  const audience = ctx.kind === "admin" ? "admin" : "client";
  const def = getKind(kind);
  if (def.audience !== audience) return fail("Tipo de notificação inválido.");
  if (!def.emailable) return fail("Este tipo não vai por e-mail.");
  await db
    .insert(notificationPreference)
    .values({ userId: ctx.user.id, kind, email })
    .onConflictDoUpdate({ target: [notificationPreference.userId, notificationPreference.kind], set: { email, updatedAt: new Date() } });
  await audit({ actorId: ctx.user.id, action: "notification.preference.updated", entityType: "user", entityId: ctx.user.id, metadata: { kind, email } });
  return ok(null);
}
