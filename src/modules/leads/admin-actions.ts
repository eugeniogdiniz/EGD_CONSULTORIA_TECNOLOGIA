import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";
import { ok, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";

// Funções de domínio do admin (não são server actions): recebem o contexto
// já autorizado por requireAdmin() no wrapper de formulário.

export async function markLeadSeen(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  await db.update(leads).set({ status: "seen" }).where(eq(leads.id, id));
  await audit({ actorId: ctx.user.id, action: "lead.seen", entityType: "lead", entityId: id });
  return ok(null);
}
