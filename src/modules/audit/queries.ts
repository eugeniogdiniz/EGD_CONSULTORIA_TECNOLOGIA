import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";

/** Últimos eventos de auditoria. Só admin lê auditoria; o contexto garante isso na chamada. */
export function listAudit(_ctx: AdminContext, { limit = 100 }: { limit?: number } = {}) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}
