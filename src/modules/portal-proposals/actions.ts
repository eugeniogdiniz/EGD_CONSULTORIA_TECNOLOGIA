import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { crmInteraction, crmProposal, crmProposalDecision } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { PortalContext } from "@/modules/auth/context";
import { notifyProposalDecided } from "@/modules/notifications/events";
import { enqueueWebhook } from "@/modules/webhooks/queue";
import { syncOpportunityStageFromProposal } from "@/modules/crm/actions";
import { getPortalProposal } from "./queries";
import { canDecide, decisionSchema, type DecisionInput } from "./rules";

export type RequestEvidence = { ip: string | null; userAgent: string | null };

const ipHash = (ip: string | null) => (ip ? createHmac("sha256", env.BETTER_AUTH_SECRET).update(ip).digest("hex").slice(0, 32) : null);

/** Aceita ou recusa a proposta em nome da organização; grava a evidência e muda o status como o admin faria. */
export async function decideProposal(ctx: PortalContext, proposalId: string, input: DecisionInput, evidence: RequestEvidence, now = new Date()): Promise<ActionResult<null>> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const p = await getPortalProposal(ctx, proposalId);
  if (!p) return fail("Proposta não encontrada.");
  if (p.decision) return fail("Esta proposta já tem uma decisão registrada.");
  if (!canDecide(p.status)) return fail(p.status === "expired" ? "Esta proposta expirou. Peça à EGD uma versão renovada." : "Esta proposta não está mais aguardando decisão.");
  const d = parsed.data;
  const decided = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(crmProposal)
      .set({ status: d.decision, decidedAt: now, decisionNotes: d.decision === "rejected" ? d.notes : d.notes || `Aceita pelo cliente no portal por ${d.name}.` })
      .where(and(eq(crmProposal.id, proposalId), eq(crmProposal.status, "sent")))
      .returning({ id: crmProposal.id, opportunityId: crmProposal.opportunityId });
    if (!row) return null;
    await tx.insert(crmProposalDecision).values({
      proposalId,
      userId: ctx.user.id,
      decision: d.decision,
      name: d.decision === "accepted" ? d.name : ctx.user.name,
      notes: d.notes || null,
      ipHash: ipHash(evidence.ip),
      userAgent: evidence.userAgent?.slice(0, 300) ?? null,
      fileId: p.fileId,
      documentVersion: p.documentVersion,
      decidedAt: now,
    });
    await tx.insert(crmInteraction).values({
      type: "note",
      at: now,
      byUserId: ctx.user.id,
      summary: d.decision === "accepted" ? `Proposta ${p.number} aceita pelo cliente no portal (${d.name})` : `Proposta ${p.number} recusada pelo cliente no portal`,
      body: d.notes || null,
      opportunityId: row.opportunityId,
    });
    return row;
  });
  if (!decided) return fail("Esta proposta não está mais aguardando decisão.");
  await audit({
    actorId: ctx.user.id,
    action: d.decision === "accepted" ? "portal.proposal.accepted" : "portal.proposal.rejected",
    entityType: "crm_proposal",
    entityId: proposalId,
    organizationId: ctx.organization.id,
    metadata: { documentVersion: p.documentVersion, fileId: p.fileId },
  });
  await audit({ actorId: ctx.user.id, action: d.decision === "accepted" ? "crm.proposal.accepted" : "crm.proposal.rejected", entityType: "crm_proposal", entityId: proposalId, metadata: { from: "sent", to: d.decision, byClient: true } });
  await notifyProposalDecided({ proposalId, number: p.number, title: p.title, decision: d.decision, organizationName: ctx.organization.name, actorId: ctx.user.id, actorName: ctx.user.name, notes: d.notes || null });
  await syncOpportunityStageFromProposal(ctx.user.id, decided.opportunityId, d.decision);
  if (d.decision === "accepted") await enqueueWebhook("proposal.accepted", { id: proposalId, number: p.number, title: p.title, valueCents: p.valueCents, byClient: true });
  return ok(null);
}
