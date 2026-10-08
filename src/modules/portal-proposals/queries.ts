import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, crmOpportunity, crmProposal, crmProposalDecision, files, users } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";

const scope = (ctx: PortalContext) => and(eq(crmCompany.linkedOrganizationId, ctx.organization.id), ne(crmProposal.status, "draft"), isNotNull(crmProposal.fileId));

const columns = {
  id: crmProposal.id,
  number: crmProposal.number,
  title: crmProposal.title,
  status: crmProposal.status,
  valueCents: crmProposal.valueCents,
  sentAt: crmProposal.sentAt,
  validUntil: crmProposal.validUntil,
  decidedAt: crmProposal.decidedAt,
  documentVersion: crmProposal.documentVersion,
  companyName: crmCompany.name,
  opportunityTitle: crmOpportunity.title,
};

/** Propostas da empresa vinculada à organização ativa, já enviadas e com arquivo. */
export function listPortalProposals(ctx: PortalContext) {
  return db
    .select(columns)
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .where(scope(ctx))
    .orderBy(desc(crmProposal.sentAt), desc(crmProposal.createdAt));
}

export async function getPortalProposal(ctx: PortalContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      ...columns,
      fileId: crmProposal.fileId,
      fileName: files.originalName,
      fileSize: files.sizeBytes,
      bucketKey: files.bucketKey,
      decision: crmProposalDecision.decision,
      decisionName: crmProposalDecision.name,
      decisionNotes: crmProposalDecision.notes,
      decisionAt: crmProposalDecision.decidedAt,
      decisionBy: users.name,
    })
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .leftJoin(files, eq(crmProposal.fileId, files.id))
    .leftJoin(crmProposalDecision, eq(crmProposalDecision.proposalId, crmProposal.id))
    .leftJoin(users, eq(crmProposalDecision.userId, users.id))
    .where(and(eq(crmProposal.id, id), scope(ctx)))
    .limit(1);
  return row ?? null;
}

/** Evidência do aceite para a tela do admin. */
export async function getProposalDecision(_ctx: AdminContext, proposalId: string) {
  if (!isUuid(proposalId)) return null;
  const [row] = await db
    .select({
      decision: crmProposalDecision.decision,
      name: crmProposalDecision.name,
      notes: crmProposalDecision.notes,
      ipHash: crmProposalDecision.ipHash,
      userAgent: crmProposalDecision.userAgent,
      fileId: crmProposalDecision.fileId,
      fileName: files.originalName,
      documentVersion: crmProposalDecision.documentVersion,
      decidedAt: crmProposalDecision.decidedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(crmProposalDecision)
    .innerJoin(users, eq(crmProposalDecision.userId, users.id))
    .leftJoin(files, eq(crmProposalDecision.fileId, files.id))
    .where(eq(crmProposalDecision.proposalId, proposalId))
    .limit(1);
  return row ?? null;
}

/** Organização com portal da empresa de uma proposta (para avisar os membros no envio). */
export async function organizationForProposal(proposalId: string): Promise<string | null> {
  const [row] = await db
    .select({ organizationId: crmCompany.linkedOrganizationId })
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .where(eq(crmProposal.id, proposalId))
    .limit(1);
  return row?.organizationId ?? null;
}
