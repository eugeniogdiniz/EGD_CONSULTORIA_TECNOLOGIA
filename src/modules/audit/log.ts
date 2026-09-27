import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";
import { logger } from "@/lib/logger";

export type AuditEvent = {
  /** null = ação do sistema, sem usuário */
  actorId: string | null;
  /** ex.: auth.login, invitation.sent, file.uploaded, organization.updated */
  action: string;
  entityType: string;
  entityId: string;
  organizationId?: string | null;
  /** dados relevantes ou diff; nunca segredos */
  metadata?: Record<string, unknown>;
};

/** Registra um evento de auditoria. Nunca lança: falha vai para o log. */
export async function audit(e: AuditEvent): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: e.actorId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      organizationId: e.organizationId ?? null,
      metadata: e.metadata ?? {},
    });
  } catch (err) {
    logger.error("audit.failed", { action: e.action, err: String(err) });
  }
}
