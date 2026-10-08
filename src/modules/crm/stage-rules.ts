/**
 * Ligação entre a proposta e o funil (puro): o que acontece com a proposta
 * puxa a oportunidade de estágio. Enviar leva para "Proposta" (só se ainda
 * estiver antes); aceite leva para "Ganho"; recusa leva para "Perdido" (só se
 * ainda estiver aberta). `null` = não mexe.
 */
export type Stage = "new" | "qualified" | "meeting" | "proposal" | "won" | "lost";
export type ProposalEvent = "sent" | "accepted" | "rejected";

const BEFORE_PROPOSAL: readonly Stage[] = ["new", "qualified", "meeting"];
const OPEN: readonly Stage[] = ["new", "qualified", "meeting", "proposal"];

export const LOST_BY_PROPOSAL_REASON = "Proposta recusada pelo cliente";

export function stageAfterProposal(current: Stage, event: ProposalEvent): Stage | null {
  if (event === "sent") return BEFORE_PROPOSAL.includes(current) ? "proposal" : null;
  if (event === "accepted") return current === "won" ? null : "won";
  return OPEN.includes(current) ? "lost" : null;
}
