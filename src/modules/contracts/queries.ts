import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, crmContract, crmOpportunity, crmProposal, files } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";

export const CONTRACT_STATUS_LABEL: Record<"draft" | "issued" | "signed", string> = { draft: "Rascunho", issued: "Emitido", signed: "Assinado" };

const joined = () =>
  db
    .select({ contract: crmContract, proposal: crmProposal, opportunity: crmOpportunity, company: crmCompany, file: files })
    .from(crmContract)
    .innerJoin(crmProposal, eq(crmContract.proposalId, crmProposal.id))
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .leftJoin(files, eq(crmContract.fileId, files.id));

export async function getContract(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await joined().where(eq(crmContract.id, id)).limit(1);
  return row ?? null;
}

export async function getContractByProposal(_ctx: AdminContext, proposalId: string) {
  if (!isUuid(proposalId)) return null;
  const [row] = await joined().where(eq(crmContract.proposalId, proposalId)).limit(1);
  return row ?? null;
}

export function listContracts(_ctx: AdminContext) {
  return db
    .select({
      id: crmContract.id,
      number: crmContract.number,
      status: crmContract.status,
      documentVersion: crmContract.documentVersion,
      issuedAt: crmContract.issuedAt,
      signedAt: crmContract.signedAt,
      createdAt: crmContract.createdAt,
      proposalId: crmProposal.id,
      proposalNumber: crmProposal.number,
      title: crmProposal.title,
      valueCents: crmProposal.valueCents,
      companyId: crmCompany.id,
      companyName: crmCompany.name,
    })
    .from(crmContract)
    .innerJoin(crmProposal, eq(crmContract.proposalId, crmProposal.id))
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .orderBy(desc(crmContract.createdAt));
}

/** Contrato emitido (ou assinado) da proposta, para a organização ativa do portal baixar. */
export async function getPortalContract(ctx: PortalContext, proposalId: string) {
  if (!isUuid(proposalId)) return null;
  const [row] = await db
    .select({
      id: crmContract.id,
      number: crmContract.number,
      status: crmContract.status,
      documentVersion: crmContract.documentVersion,
      issuedAt: crmContract.issuedAt,
      signedAt: crmContract.signedAt,
      fileId: crmContract.fileId,
      fileName: files.originalName,
      fileSize: files.sizeBytes,
      bucketKey: files.bucketKey,
    })
    .from(crmContract)
    .innerJoin(crmProposal, eq(crmContract.proposalId, crmProposal.id))
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .innerJoin(files, eq(crmContract.fileId, files.id))
    .where(and(eq(crmContract.proposalId, proposalId), eq(crmCompany.linkedOrganizationId, ctx.organization.id), inArray(crmContract.status, ["issued", "signed"]), isNotNull(crmContract.fileId)))
    .limit(1);
  return row ?? null;
}
