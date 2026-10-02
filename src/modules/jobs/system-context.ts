import type { AdminContext } from "@/modules/auth/context";

/**
 * Contexto usado pelas automações para reaproveitar as queries do admin, que
 * recebem o contexto só por assinatura (`_ctx`) e não o consultam. Nunca
 * passe este objeto a uma action: ações auditam com `actorId: null`.
 */
export const SYSTEM_CONTEXT: AdminContext = {
  kind: "admin",
  user: { id: "00000000-0000-0000-0000-000000000000", name: "Sistema", email: "sistema@egdsystem.com.br", role: "admin", active: true },
};
