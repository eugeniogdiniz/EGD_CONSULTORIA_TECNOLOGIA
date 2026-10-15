import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  crmCompany,
  crmContract,
  crmOpportunity,
  crmProposal,
  files,
  organizations,
  projectDeliverable,
  projectDeliverableAttachment,
  projectDocument,
  projectDocumentFolder,
} from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { createProjectFromOpportunity, enableClientPortal } from "@/modules/projects/actions";
import { createFolder, deleteDocument, deleteFolder, updateDocument, updateFolder, uploadDocuments } from "@/modules/project-documents/actions";
import { getPortalProjectDocumentFile, getPortalProjectDocuments, getProjectDocuments } from "@/modules/project-documents/queries";
import { getPortalProject } from "@/modules/portal-projects/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
const pdf = (name: string) => new File(["%PDF-1.4 teste"], name, { type: "application/pdf" });

async function wonOpportunity(companyId: string, title: string) {
  const [o] = await db
    .insert(crmOpportunity)
    .values({ companyId, title, stage: "won", ownerId: admin.user.id, wonAt: new Date() })
    .returning({ id: crmOpportunity.id });
  return o.id;
}

async function company(name: string, slug: string, extra: Partial<typeof crmCompany.$inferInsert> = {}) {
  const [c] = await db.insert(crmCompany).values({ name, slug, ownerId: admin.user.id, ...extra }).returning({ id: crmCompany.id });
  return c.id;
}

async function newProject(companyId: string, title: string) {
  const r = await createProjectFromOpportunity(admin, await wonOpportunity(companyId, title), { title, copyValue: false });
  if (!r.ok) throw new Error(r.error);
  return r.data.id;
}

async function portalCtx(organizationId: string, email: string): Promise<PortalContext> {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name: email, emailVerified: true, role: "client", active: true }, { method: "admin" });
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, organizationId) });
  if (!org) throw new Error("org");
  return { kind: "portal", user: { id: u.id, name: email, email, role: "client", active: true }, organization: org, organizations: [org] };
}

async function folderId(projectId: string, systemKey: string) {
  const f = await db.query.projectDocumentFolder.findFirst({
    where: and(eq(projectDocumentFolder.projectId, projectId), eq(projectDocumentFolder.systemKey, systemKey)),
  });
  if (!f) throw new Error(`pasta ${systemKey}`);
  return f.id;
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
});

describe("organização do cliente ao criar projeto", () => {
  it("cria a organização com o nome da empresa e vincula", async () => {
    const c = await company("Construtora Alfa", "construtora-alfa", { cnpj: "11.222.333/0001-81" });
    const pid = await newProject(c, "Obra Alfa");
    const row = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c) });
    expect(row?.linkedOrganizationId).toBeTruthy();
    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, row!.linkedOrganizationId!) });
    expect(org?.name).toBe("Construtora Alfa");
    expect(org?.slug).toBe("construtora-alfa");

    // o segundo projeto da mesma empresa reaproveita a organização
    await newProject(c, "Obra Alfa 2");
    const again = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c) });
    expect(again?.linkedOrganizationId).toBe(row!.linkedOrganizationId);

    // o cliente já enxerga o projeto no portal
    const ctx = await portalCtx(row!.linkedOrganizationId!, "alfa@test.local");
    expect(await getPortalProject(ctx, pid)).not.toBeNull();
  });

  it("vincula à organização existente com o mesmo CNPJ, mesmo com máscara diferente", async () => {
    const [org] = await db.insert(organizations).values({ name: "Beta Engenharia Ltda", slug: "beta-ltda", cnpj: "22333444000190" }).returning();
    const c = await company("Beta", "beta", { cnpj: "22.333.444/0001-90" });
    await newProject(c, "Obra Beta");
    const row = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c) });
    expect(row?.linkedOrganizationId).toBe(org.id);
  });

  it("slug em uso ganha sufixo", async () => {
    await db.insert(organizations).values({ name: "Gama outra", slug: "gama" });
    const c = await company("Gama", "gama-crm");
    await newProject(c, "Obra Gama");
    const row = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c) });
    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, row!.linkedOrganizationId!) });
    expect(org?.slug).toBe("gama-2");
  });

  it("enableClientPortal libera projeto antigo e é idempotente", async () => {
    const c = await company("Delta", "delta");
    const { project } = await import("@/db/schema");
    const [p] = await db
      .insert(project)
      .values({ opportunityId: await wonOpportunity(c, "Antigo"), companyId: c, title: "Antigo", ownerId: admin.user.id })
      .returning({ id: project.id });
    const first = await enableClientPortal(admin, p.id);
    const second = await enableClientPortal(admin, p.id);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.data.organizationId).toBe(first.data.organizationId);
    expect(await db.$count(organizations, eq(organizations.name, "Delta"))).toBe(1);
  });
});

describe("GED do projeto", () => {
  let pid: string;
  let orgId: string;
  let client: PortalContext;
  let outsider: PortalContext;

  beforeAll(async () => {
    const c = await company("Épsilon Obras", "epsilon");
    pid = await newProject(c, "Obra Épsilon");
    orgId = (await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c) }))!.linkedOrganizationId!;
    client = await portalCtx(orgId, "epsilon@test.local");
    const [other] = await db.insert(organizations).values({ name: "Outra", slug: "outra-ged" }).returning();
    outsider = await portalCtx(other.id, "outra@test.local");
  });

  it("projeto nasce com as seis pastas padrão", async () => {
    const ged = await getProjectDocuments(admin, pid);
    expect(ged?.folders.map((f) => f.name)).toEqual(["Proposta", "Contrato", "Administrativo", "Financeiro", "Técnico", "Entregas"]);
  });

  it("envia vários arquivos, cada um com o próprio título", async () => {
    const r = await uploadDocuments(admin, { folderId: await folderId(pid, "administrativo"), files: [pdf("ART.pdf"), pdf("Alvará de obra.pdf")] });
    expect(r.ok).toBe(true);
    const ged = await getProjectDocuments(admin, pid);
    const titles = ged!.documents.filter((d) => d.source === "upload").map((d) => d.title).sort();
    expect(titles).toEqual(["ART", "Alvará de obra"]);
  });

  it("aceita documento acima de 50 MB e recusa acima de 100 MB", async () => {
    const folder = await folderId(pid, "tecnico");
    const big = new File([new Uint8Array(60 * 1024 * 1024)], "base-exportada.zip", { type: "application/zip" });
    const r = await uploadDocuments(admin, { folderId: folder, files: [big] });
    expect(r.ok).toBe(true);
    const tooBig = new File([new Uint8Array(100 * 1024 * 1024 + 1)], "grande-demais.zip", { type: "application/zip" });
    const r2 = await uploadDocuments(admin, { folderId: folder, files: [tooBig] });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toMatch(/100 MB/);
    if (r.ok) await deleteDocument(admin, r.data.ids[0]);
  });

  it("cliente não vê pasta interna nem baixa o arquivo dela", async () => {
    const ged = await getPortalProjectDocuments(client, pid);
    expect(ged?.folders.map((f) => f.name)).toEqual(["Proposta", "Contrato", "Entregas"]);
    const internal = (await getProjectDocuments(admin, pid))!.documents.find((d) => d.title === "ART")!;
    expect(await getPortalProjectDocumentFile(client, pid, internal.fileId)).toBeNull();
  });

  it("ao compartilhar a pasta o cliente passa a ver; outra organização nunca vê", async () => {
    const adm = await folderId(pid, "administrativo");
    expect((await updateFolder(admin, adm, { name: "Administrativo", visibleToClient: true })).ok).toBe(true);
    const art = (await getProjectDocuments(admin, pid))!.documents.find((d) => d.title === "ART")!;
    expect(await getPortalProjectDocumentFile(client, pid, art.fileId)).not.toBeNull();
    expect(await getPortalProjectDocuments(outsider, pid)).toBeNull();
    expect(await getPortalProjectDocumentFile(outsider, pid, art.fileId)).toBeNull();
    await updateFolder(admin, adm, { name: "Administrativo", visibleToClient: false });
  });

  it("proposta, contrato e entrega aparecem sozinhos, com as regras do portal para o cliente", async () => {
    const proj = await db.query.project.findFirst({ where: (t, { eq }) => eq(t.id, pid) });
    const mkFile = async (name: string) =>
      (
        await db
          .insert(files)
          .values({ bucketKey: `test/${name}`, originalName: name, mimeType: "application/pdf", sizeBytes: 10, uploadedBy: admin.user.id })
          .returning({ id: files.id })
      )[0].id;
    const [draft] = await db
      .insert(crmProposal)
      .values({ number: "PROP-26-901", opportunityId: proj!.opportunityId, title: "Rascunho", valueCents: 1, ownerId: admin.user.id, fileId: await mkFile("rascunho.pdf") })
      .returning({ id: crmProposal.id });
    const [sent] = await db
      .insert(crmProposal)
      .values({ number: "PROP-26-902", opportunityId: proj!.opportunityId, title: "Enviada", valueCents: 1, status: "accepted", ownerId: admin.user.id, fileId: await mkFile("enviada.pdf") })
      .returning({ id: crmProposal.id });
    await db.insert(crmContract).values({ number: "CT-26-901", proposalId: sent.id, status: "signed", createdBy: admin.user.id, fileId: await mkFile("ct.pdf"), signedFileId: await mkFile("ct-assinado.pdf") });
    const dels = await db
      .insert(projectDeliverable)
      .values([
        { projectId: pid, title: "Projeto executivo", ownerId: admin.user.id, visibleToClient: true },
        { projectId: pid, title: "Rascunho interno", ownerId: admin.user.id, visibleToClient: false },
      ])
      .returning({ id: projectDeliverable.id });
    await db.insert(projectDeliverableAttachment).values([
      { deliverableId: dels[0].id, fileId: await mkFile("executivo.pdf"), uploadedBy: admin.user.id },
      { deliverableId: dels[0].id, fileId: await mkFile("executivo-memorial.pdf"), uploadedBy: admin.user.id },
      { deliverableId: dels[1].id, fileId: await mkFile("interno.pdf"), uploadedBy: admin.user.id },
    ]);

    const team = (await getProjectDocuments(admin, pid))!.documents.map((d) => d.key.split(":")[0] + ":" + d.title);
    expect(team).toEqual(
      expect.arrayContaining([
        "proposal:Proposta PROP-26-901",
        "proposal:Proposta PROP-26-902",
        "contract:Contrato CT-26-901",
        "contract_signed:Contrato CT-26-901 assinado",
        "deliverable:Projeto executivo",
        "deliverable:Rascunho interno",
      ]),
    );

    const seenDocs = (await getPortalProjectDocuments(client, pid))!.documents;
    expect(seenDocs.filter((d) => d.source === "deliverable").map((d) => d.fileName).sort()).toEqual(["executivo-memorial.pdf", "executivo.pdf"]);
    const seen = seenDocs.map((d) => d.title);
    expect(seen).toContain("Proposta PROP-26-902");
    expect(seen).not.toContain("Proposta PROP-26-901");
    expect(seen).toContain("Contrato CT-26-901 assinado");
    expect(seen).not.toContain("Contrato CT-26-901");
    expect(seen).toContain("Projeto executivo");
    expect(seen).not.toContain("Rascunho interno");
    expect(draft.id).toBeTruthy();
  });

  it("move documento de pasta só dentro do mesmo projeto", async () => {
    const doc = (await getProjectDocuments(admin, pid))!.documents.find((d) => d.title === "ART")!;
    const ok = await updateDocument(admin, doc.documentId!, { folderId: await folderId(pid, "tecnico"), title: "ART de execução", notes: "Assinada pelo RT" });
    expect(ok.ok).toBe(true);
    const moved = (await getProjectDocuments(admin, pid))!.documents.find((d) => d.documentId === doc.documentId)!;
    expect(moved.title).toBe("ART de execução");
    expect(moved.folderId).toBe(await folderId(pid, "tecnico"));

    const other = await newProject(await company("Zeta", "zeta"), "Obra Zeta");
    const cross = await updateDocument(admin, doc.documentId!, { folderId: await folderId(other, "tecnico"), title: "x" });
    expect(cross.ok).toBe(false);
  });

  it("pasta padrão não se exclui; pasta nova só vazia", async () => {
    expect((await deleteFolder(admin, await folderId(pid, "contrato"))).ok).toBe(false);
    const created = await createFolder(admin, pid, { name: "Medições", visibleToClient: true });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect((await createFolder(admin, pid, { name: "medições" })).ok).toBe(false);
    await uploadDocuments(admin, { folderId: created.data.id, title: "Medição 01", files: [pdf("med1.pdf")] });
    expect((await deleteFolder(admin, created.data.id)).ok).toBe(false);
    const doc = (await getProjectDocuments(admin, pid))!.documents.find((d) => d.title === "Medição 01")!;
    expect((await deleteDocument(admin, doc.documentId!)).ok).toBe(true);
    expect(await db.query.files.findFirst({ where: eq(files.id, doc.fileId) })).toBeUndefined();
    expect(await db.$count(projectDocument, eq(projectDocument.id, doc.documentId!))).toBe(0);
    expect((await deleteFolder(admin, created.data.id)).ok).toBe(true);
  });
});
