import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmContract,
  crmProposal,
  files,
  project,
  projectDeliverable,
  projectDocument,
  projectDocumentFolder,
  users,
} from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import type { SystemFolderKey } from "./folders";

/**
 * O GED junta duas fontes: documentos enviados nas pastas (`project_document`)
 * e documentos que o sistema já produz em outros módulos (PDF da proposta,
 * contrato, arquivo e termo de aceite das entregas). Os do sistema aparecem
 * na pasta padrão correspondente e só se gerenciam na origem.
 */
export type DocumentSource = "upload" | "proposal" | "contract" | "contract_signed" | "deliverable" | "acceptance";

export type GedDocument = {
  key: string;
  folderId: string;
  source: DocumentSource;
  title: string;
  /** contexto curto: número da proposta, status, entrega de origem */
  detail: string | null;
  notes: string | null;
  fileId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedByName: string | null;
  /** id em project_document (só para os enviados) */
  documentId: string | null;
  /** página de origem no admin (só para os do sistema) */
  originHref: string | null;
};

export type GedFolder = {
  id: string;
  name: string;
  systemKey: string | null;
  visibleToClient: boolean;
  position: number;
  count: number;
};

type Audience = "team" | "client";

const PROPOSAL_STATUS: Record<string, string> = {
  draft: "rascunho",
  sent: "enviada",
  accepted: "aceita",
  rejected: "recusada",
  expired: "expirada",
};

const signedFiles = alias(files, "signed_files");
const acceptanceFiles = alias(files, "acceptance_files");

async function systemDocuments(
  p: { id: string; opportunityId: string },
  folderByKey: Map<string, string>,
  audience: Audience,
): Promise<GedDocument[]> {
  const out: GedDocument[] = [];
  const folder = (k: SystemFolderKey) => folderByKey.get(k);

  const proposalFolder = folder("proposta");
  if (proposalFolder) {
    const rows = await db
      .select({ id: crmProposal.id, number: crmProposal.number, title: crmProposal.title, status: crmProposal.status, file: files })
      .from(crmProposal)
      .innerJoin(files, eq(crmProposal.fileId, files.id))
      .where(
        and(
          eq(crmProposal.opportunityId, p.opportunityId),
          audience === "client" ? ne(crmProposal.status, "draft") : undefined,
        ),
      )
      .orderBy(asc(crmProposal.createdAt));
    for (const r of rows)
      out.push({
        key: `proposal:${r.id}`,
        folderId: proposalFolder,
        source: "proposal",
        title: `Proposta ${r.number}`,
        detail: audience === "team" ? `${r.title} · ${PROPOSAL_STATUS[r.status] ?? r.status}` : r.title,
        notes: null,
        fileId: r.file.id,
        fileName: r.file.originalName,
        sizeBytes: r.file.sizeBytes,
        createdAt: r.file.createdAt,
        uploadedByName: null,
        documentId: null,
        originHref: `/admin/crm/propostas/${r.id}`,
      });
  }

  const contractFolder = folder("contrato");
  if (contractFolder) {
    const rows = await db
      .select({ id: crmContract.id, number: crmContract.number, status: crmContract.status, file: files, signed: signedFiles })
      .from(crmContract)
      .innerJoin(crmProposal, eq(crmContract.proposalId, crmProposal.id))
      .leftJoin(files, eq(crmContract.fileId, files.id))
      .leftJoin(signedFiles, eq(crmContract.signedFileId, signedFiles.id))
      .where(
        and(
          eq(crmProposal.opportunityId, p.opportunityId),
          audience === "client" ? inArray(crmContract.status, ["issued", "signed"]) : undefined,
        ),
      )
      .orderBy(asc(crmContract.createdAt));
    for (const r of rows) {
      const base = { folderId: contractFolder, notes: null, uploadedByName: null, documentId: null, originHref: `/admin/crm/contratos/${r.id}` };
      // o cliente vê um arquivo só: o assinado, quando existe (mesma regra da página da proposta no portal)
      const showIssued = r.file && (audience === "team" || !r.signed);
      if (showIssued && r.file)
        out.push({
          ...base,
          key: `contract:${r.id}`,
          source: "contract",
          title: `Contrato ${r.number}`,
          detail: r.status === "draft" ? "minuta" : r.status === "issued" ? "emitido" : "versão emitida",
          fileId: r.file.id,
          fileName: r.file.originalName,
          sizeBytes: r.file.sizeBytes,
          createdAt: r.file.createdAt,
        });
      if (r.signed)
        out.push({
          ...base,
          key: `contract_signed:${r.id}`,
          source: "contract_signed",
          title: `Contrato ${r.number} assinado`,
          detail: "assinado",
          fileId: r.signed.id,
          fileName: r.signed.originalName,
          sizeBytes: r.signed.sizeBytes,
          createdAt: r.signed.createdAt,
        });
    }
  }

  const deliveryFolder = folder("entregas");
  if (deliveryFolder) {
    const rows = await db
      .select({ id: projectDeliverable.id, title: projectDeliverable.title, file: files, acceptance: acceptanceFiles })
      .from(projectDeliverable)
      .leftJoin(files, eq(projectDeliverable.fileId, files.id))
      .leftJoin(acceptanceFiles, eq(projectDeliverable.acceptanceFileId, acceptanceFiles.id))
      .where(
        and(
          eq(projectDeliverable.projectId, p.id),
          audience === "client" ? eq(projectDeliverable.visibleToClient, true) : undefined,
        ),
      )
      .orderBy(asc(projectDeliverable.createdAt));
    for (const r of rows) {
      const base = { folderId: deliveryFolder, notes: null, uploadedByName: null, documentId: null, originHref: `/admin/projetos/${p.id}/entregas/${r.id}` };
      if (r.file)
        out.push({
          ...base,
          key: `deliverable:${r.id}`,
          source: "deliverable",
          title: r.title,
          detail: "arquivo da entrega",
          fileId: r.file.id,
          fileName: r.file.originalName,
          sizeBytes: r.file.sizeBytes,
          createdAt: r.file.createdAt,
        });
      if (r.acceptance)
        out.push({
          ...base,
          key: `acceptance:${r.id}`,
          source: "acceptance",
          title: `Termo de aceite · ${r.title}`,
          detail: "termo de aceite",
          fileId: r.acceptance.id,
          fileName: r.acceptance.originalName,
          sizeBytes: r.acceptance.sizeBytes,
          createdAt: r.acceptance.createdAt,
        });
    }
  }
  return out;
}

async function collect(p: { id: string; opportunityId: string }, audience: Audience) {
  const folderRows = await db
    .select()
    .from(projectDocumentFolder)
    .where(
      and(
        eq(projectDocumentFolder.projectId, p.id),
        audience === "client" ? eq(projectDocumentFolder.visibleToClient, true) : undefined,
      ),
    )
    .orderBy(asc(projectDocumentFolder.position), asc(projectDocumentFolder.createdAt));
  if (folderRows.length === 0) return { folders: [] as GedFolder[], documents: [] as GedDocument[] };

  const folderIds = folderRows.map((f) => f.id);
  const folderByKey = new Map(folderRows.filter((f) => f.systemKey).map((f) => [f.systemKey as string, f.id]));

  const [uploaded, system] = await Promise.all([
    db
      .select({ doc: projectDocument, file: files, uploaderName: users.name })
      .from(projectDocument)
      .innerJoin(files, eq(projectDocument.fileId, files.id))
      .innerJoin(users, eq(projectDocument.uploadedBy, users.id))
      .where(and(eq(projectDocument.projectId, p.id), inArray(projectDocument.folderId, folderIds)))
      .orderBy(desc(projectDocument.createdAt)),
    systemDocuments(p, folderByKey, audience),
  ]);

  const documents: GedDocument[] = [
    ...uploaded.map((r) => ({
      key: `upload:${r.doc.id}`,
      folderId: r.doc.folderId,
      source: "upload" as const,
      title: r.doc.title,
      detail: null,
      notes: r.doc.notes,
      fileId: r.file.id,
      fileName: r.file.originalName,
      sizeBytes: r.file.sizeBytes,
      createdAt: r.doc.createdAt,
      uploadedByName: r.uploaderName,
      documentId: r.doc.id,
      originHref: null,
    })),
    ...system,
  ];

  const count = new Map<string, number>();
  for (const d of documents) count.set(d.folderId, (count.get(d.folderId) ?? 0) + 1);
  const folders: GedFolder[] = folderRows.map((f) => ({
    id: f.id,
    name: f.name,
    systemKey: f.systemKey,
    visibleToClient: f.visibleToClient,
    position: f.position,
    count: count.get(f.id) ?? 0,
  }));
  return { folders, documents };
}

/** GED completo do projeto para a equipe: todas as pastas, enviados e documentos do sistema. */
export async function getProjectDocuments(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return null;
  const p = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    columns: { id: true, opportunityId: true },
  });
  if (!p) return null;
  return collect(p, "team");
}

/**
 * GED do projeto como o cliente vê: só pastas compartilhadas, e documentos do
 * sistema pelas mesmas regras do resto do portal. Projeto fora da organização
 * ativa ou arquivado = null.
 */
export async function getPortalProjectDocuments(ctx: PortalContext, projectId: string) {
  if (!isUuid(projectId)) return null;
  const [p] = await db
    .select({ id: project.id, opportunityId: project.opportunityId })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(and(eq(project.id, projectId), eq(crmCompany.linkedOrganizationId, ctx.organization.id), isNull(project.archivedAt)))
    .limit(1);
  if (!p) return null;
  return collect(p, "client");
}

/** Arquivo que o cliente pode baixar pelo GED do projeto; null se não estiver numa pasta compartilhada. */
export async function getPortalProjectDocumentFile(ctx: PortalContext, projectId: string, fileId: string) {
  if (!isUuid(fileId)) return null;
  const ged = await getPortalProjectDocuments(ctx, projectId);
  const doc = ged?.documents.find((d) => d.fileId === fileId);
  if (!doc) return null;
  const f = await db.query.files.findFirst({ where: eq(files.id, fileId), columns: { id: true, bucketKey: true, originalName: true } });
  return f ? { ...f, source: doc.source } : null;
}

/** Pastas do projeto para os seletores (enviar, mover). */
export function listProjectFolders(_ctx: AdminContext, projectId: string) {
  return db
    .select({ id: projectDocumentFolder.id, name: projectDocumentFolder.name })
    .from(projectDocumentFolder)
    .where(eq(projectDocumentFolder.projectId, projectId))
    .orderBy(asc(projectDocumentFolder.position), asc(projectDocumentFolder.createdAt));
}
