import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appError } from "@/db/schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";

export async function resolveError(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Erro não encontrado.");
  const [row] = await db.update(appError).set({ resolvedAt: new Date(), resolvedBy: ctx.user.id }).where(eq(appError.id, id)).returning({ id: appError.id, fingerprint: appError.fingerprint });
  if (!row) return fail("Erro não encontrado.");
  await audit({ actorId: ctx.user.id, action: "error.resolved", entityType: "app_error", entityId: id, metadata: { fingerprint: row.fingerprint } });
  return ok(null);
}
