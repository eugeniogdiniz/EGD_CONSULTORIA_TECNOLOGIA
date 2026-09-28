import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/uuid";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";

// Funções de domínio do admin (não são server actions): recebem o contexto
// já autorizado por requireAdmin() no wrapper de formulário.

export async function markLeadSeen(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Lead não encontrado.");
  await db.update(leads).set({ status: "seen" }).where(eq(leads.id, id));
  await audit({ actorId: ctx.user.id, action: "lead.seen", entityType: "lead", entityId: id });
  return ok(null);
}
