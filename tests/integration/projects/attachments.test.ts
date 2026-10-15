import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, crmCompany, crmOpportunity, files, project, projectDeliverable } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { addDeliverableAttachment, deleteDeliverableAttachment } from "@/modules/projects/actions";
import { listDeliverableAttachments, listDeliverables } from "@/modules/projects/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let projectId: string;
let deliverableId: string;
const txt = (name: string, bytes = 10) => new File([new Uint8Array(bytes)], name, { type: "application/octet-stream" });

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [c] = await db.insert(crmCompany).values({ name: "Anexos Co", slug: "anexos-co", ownerId: admin.user.id }).returning({ id: crmCompany.id });
  const [o] = await db.insert(crmOpportunity).values({ companyId: c.id, title: "Op", stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(project).values({ opportunityId: o.id, companyId: c.id, title: "Projeto anexos", ownerId: admin.user.id }).returning({ id: project.id });
  projectId = p.id;
  const [d] = await db.insert(projectDeliverable).values({ projectId, title: "Relatório", ownerId: admin.user.id }).returning({ id: projectDeliverable.id });
  deliverableId = d.id;
});

describe("anexos da entrega", () => {
  it("aceita vários arquivos e o kanban conta", async () => {
    for (const n of ["planilha.xlsx", "relatorio.pdf", "evidencia.png"]) expect((await addDeliverableAttachment(admin, deliverableId, txt(n))).ok).toBe(true);
    const list = await listDeliverableAttachments(admin, deliverableId);
    expect(list.map((a) => a.name)).toEqual(["planilha.xlsx", "relatorio.pdf", "evidencia.png"]);
    expect(list[0].uploadedByName).toBe("Admin Teste");
    const card = (await listDeliverables(admin, projectId)).find((d) => d.id === deliverableId);
    expect(card?.attachmentCount).toBe(3);
  });

  it("aceita até 100 MB e recusa acima", async () => {
    const ok = await addDeliverableAttachment(admin, deliverableId, txt("base.zip", 60 * 1024 * 1024));
    expect(ok.ok).toBe(true);
    const tooBig = await addDeliverableAttachment(admin, deliverableId, txt("grande.zip", 100 * 1024 * 1024 + 1));
    expect(tooBig.ok).toBe(false);
    if (ok.ok) await deleteDeliverableAttachment(admin, ok.data.id);
  });

  it("excluir apaga o arquivo e audita", async () => {
    const [first] = await listDeliverableAttachments(admin, deliverableId);
    const r = await deleteDeliverableAttachment(admin, first.id);
    expect(r.ok).toBe(true);
    expect(await db.query.files.findFirst({ where: eq(files.id, first.fileId) })).toBeUndefined();
    expect((await listDeliverableAttachments(admin, deliverableId)).map((a) => a.name)).toEqual(["relatorio.pdf", "evidencia.png"]);
    const acts = (await db.select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, deliverableId))).map((x) => x.a);
    expect(acts).toEqual(expect.arrayContaining(["project.deliverable.file_attached", "project.deliverable.file_removed"]));
    expect((await deleteDeliverableAttachment(admin, first.id)).ok).toBe(false);
  });

  it("projeto arquivado não recebe anexo; entrega inexistente é recusada", async () => {
    await db.update(project).set({ archivedAt: new Date() }).where(eq(project.id, projectId));
    expect((await addDeliverableAttachment(admin, deliverableId, txt("x.pdf"))).ok).toBe(false);
    await db.update(project).set({ archivedAt: null }).where(eq(project.id, projectId));
    expect((await addDeliverableAttachment(admin, "99999999-9999-4999-8999-999999999999", txt("x.pdf"))).ok).toBe(false);
  });
});
