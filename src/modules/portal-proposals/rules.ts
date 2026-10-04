/** Regras puras das propostas no portal (Fase 22). */
import { z } from "zod";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

/** O cliente vê a proposta quando ela já saiu do rascunho e tem arquivo para baixar. */
export const proposalVisibleToClient = (p: { status: ProposalStatus; fileId: string | null }) => p.status !== "draft" && p.fileId !== null;

/** Só proposta enviada aceita decisão; expirada orienta a pedir renovação. */
export const canDecide = (status: ProposalStatus) => status === "sent";

export const PORTAL_PROPOSAL_STATUS_LABEL: Record<Exclude<ProposalStatus, "draft">, string> = {
  sent: "Aguardando sua decisão",
  accepted: "Aceita",
  rejected: "Recusada",
  expired: "Expirada",
};

export const decisionSchema = z
  .object({
    decision: z.enum(["accepted", "rejected"]),
    name: z.string().trim().max(120, "Máximo 120 caracteres").default(""),
    agree: z.boolean().default(false),
    notes: z.string().trim().max(2000, "Máximo 2000 caracteres").default(""),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "accepted") {
      if (v.name.length < 3) ctx.addIssue({ code: "custom", path: ["name"], message: "Digite seu nome completo para registrar o aceite." });
      if (!v.agree) ctx.addIssue({ code: "custom", path: ["agree"], message: "Confirme que leu e aceita a proposta." });
    } else if (v.notes.length < 5) {
      ctx.addIssue({ code: "custom", path: ["notes"], message: "Conte em uma frase o motivo da recusa." });
    }
  });
export type DecisionInput = z.input<typeof decisionSchema>;

export type AcceptanceDecision = "approved" | "changes_requested";
/** Última decisão do cliente sobre a entrega (lista já ordenada da mais recente para a mais antiga). */
export function acceptanceState<T extends { decision: AcceptanceDecision }>(list: T[]): T | null {
  return list[0] ?? null;
}
