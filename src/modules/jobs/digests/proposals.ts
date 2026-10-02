/**
 * Expiração automática de propostas: toda proposta enviada cuja validade
 * já passou vira "expirada". Vence hoje ainda vale hoje.
 */
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, crmOpportunity, crmProposal } from "@/db/schema";
import { audit } from "@/modules/audit/log";
import { formatBr } from "@/modules/reports/dates";

export type ExpirableProposal = { id: string; number: string; title: string; companyName: string; status: string; validUntil: string | null };

export function proposalsToExpire<T extends Pick<ExpirableProposal, "status" | "validUntil">>(rows: T[], today: string): T[] {
  return rows.filter((p) => p.status === "sent" && p.validUntil !== null && p.validUntil < today);
}

/** Propostas enviadas com validade anterior a `today`. */
export async function loadExpirableProposals(today: string): Promise<ExpirableProposal[]> {
  return db
    .select({
      id: crmProposal.id,
      number: crmProposal.number,
      title: crmProposal.title,
      companyName: crmCompany.name,
      status: crmProposal.status,
      validUntil: crmProposal.validUntil,
    })
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .where(and(eq(crmProposal.status, "sent"), isNotNull(crmProposal.validUntil), lt(crmProposal.validUntil, today)))
    .orderBy(crmProposal.number);
}

export async function expireProposals(today: string, now: Date) {
  const rows = proposalsToExpire(await loadExpirableProposals(today), today);
  const expired: string[] = [];
  for (const p of rows) {
    const [updated] = await db
      .update(crmProposal)
      .set({ status: "expired", decidedAt: now, decisionNotes: `Expirada automaticamente em ${formatBr(today)}.` })
      // a condição de status protege contra alguém que decidiu a proposta entre a leitura e a gravação
      .where(and(eq(crmProposal.id, p.id), eq(crmProposal.status, "sent")))
      .returning({ id: crmProposal.id });
    if (!updated) continue;
    expired.push(p.number);
    await audit({
      actorId: null,
      action: "crm.proposal.expired",
      entityType: "crm_proposal",
      entityId: p.id,
      metadata: { from: "sent", to: "expired", automatic: true, validUntil: p.validUntil },
    });
  }
  return { expired: expired.length, numbers: expired };
}
