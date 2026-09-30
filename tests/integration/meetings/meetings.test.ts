import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog, crmCompany, crmOpportunity, meeting, meetingParticipant, organizations, project, projectDeliverable } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { addActionItem, createMeeting, deleteMeeting, setMeetingShared, updateMeeting } from "@/modules/meetings/actions";
import {
  getDeliverableOrigin,
  getPortalMeeting,
  listActionItems,
  listMeetings,
  listParticipants,
  listPortalActionItems,
  listPortalMeetings,
} from "@/modules/meetings/queries";
import { listBacklog } from "@/modules/projects/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let ctxA: PortalContext;
let ctxB: PortalContext;
let companyA: string;
let companyB: string;
let companyNoPortal: string;
let projA: string;
let projA2: string;
let projB: string;

async function client(email: string, name: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active: true }, { method: "admin" });
  return { id: u.id, name, email, role: "client" as const, active: true };
}
async function makeProject(companyId: string, title: string) {
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title, stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId, title, status: "active", ownerId: admin.user.id }).returning({ id: project.id });
  return p.id;
}
const base = { title: "Reunião de kickoff", heldAt: "2026-10-01T14:30", agenda: "Escopo\nCronograma", decisions: "Entregar o piloto em novembro." };

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [orgA] = await db.insert(organizations).values({ name: "Org A", slug: "org-a" }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org B", slug: "org-b" }).returning();
  ctxA = { kind: "portal", user: await client("ata-a@test.local", "Cliente A"), organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: await client("ata-b@test.local", "Cliente B"), organization: orgB, organizations: [orgB] };
  const mk = async (name: string, slug: string, org: string | null) =>
    (await db.insert(crmCompany).values({ name, slug, ownerId: admin.user.id, linkedOrganizationId: org }).returning({ id: crmCompany.id }))[0].id;
  companyA = await mk("Empresa A", "empresa-a", orgA.id);
  companyB = await mk("Empresa B", "empresa-b", orgB.id);
  companyNoPortal = await mk("Empresa sem portal", "empresa-sem-portal", null);
  projA = await makeProject(companyA, "Projeto A");
  projA2 = await makeProject(companyA, "Projeto A2");
  projB = await makeProject(companyB, "Projeto B");
});

describe("criar e editar ata", () => {
  it("ata de projeto herda a empresa; participantes da equipe e externos em ordem", async () => {
    const r = await createMeeting(admin, { ...base, projectId: projA, teamIds: [admin.user.id], externals: "Ana — Empresa A\nBeto" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = await db.query.meeting.findFirst({ where: eq(meeting.id, r.data.id) });
    expect(row?.companyId).toBe(companyA);
    expect(row?.heldAt.toISOString()).toBe("2026-10-01T17:30:00.000Z");
    expect(row?.sharedWithClient).toBe(false);
    const people = await listParticipants(admin, r.data.id);
    expect(people.map((p) => [p.name, p.organization, Boolean(p.userId)])).toEqual([
      ["Admin Teste", "EGD", true],
      ["Ana", "Empresa A", false],
      ["Beto", null, false],
    ]);
    const [a] = await db.select().from(auditLog).where(eq(auditLog.entityId, r.data.id));
    expect(a.action).toBe("meeting.created");
  });

  it("ata só da empresa, sem projeto", async () => {
    const r = await createMeeting(admin, { ...base, title: "Conta anual", companyId: companyA });
    expect(r.ok).toBe(true);
    const list = await listMeetings(admin, { companyId: companyA });
    expect(list.some((m) => m.title === "Conta anual" && m.projectId === null)).toBe(true);
  });

  it("recusa projeto de outra empresa e ata sem projeto nem empresa", async () => {
    const r1 = await createMeeting(admin, { ...base, projectId: projB, companyId: companyA });
    expect(r1.ok).toBe(false);
    const r2 = await createMeeting(admin, { ...base });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.fieldErrors?.projectId).toBeDefined();
  });

  it("editar substitui os participantes", async () => {
    const r = await createMeeting(admin, { ...base, projectId: projA, externals: "Ana\nBeto" });
    if (!r.ok) throw new Error(r.error);
    const u = await updateMeeting(admin, r.data.id, { ...base, title: "Kickoff (revisada)", projectId: projA, externals: "Carla — Empresa A" });
    expect(u.ok).toBe(true);
    const people = await db.select().from(meetingParticipant).where(eq(meetingParticipant.meetingId, r.data.id));
    expect(people.map((p) => p.name)).toEqual(["Carla"]);
  });
});

describe("itens de ação", () => {
  let meetingId: string;
  beforeAll(async () => {
    const r = await createMeeting(admin, { ...base, title: "Acompanhamento", projectId: projA });
    if (!r.ok) throw new Error(r.error);
    meetingId = r.data.id;
  });

  it("vira entrega do projeto, entra no backlog e aponta a ata de origem", async () => {
    const r = await addActionItem(admin, { meetingId, projectId: projA, title: "Enviar cronograma revisado", priority: "high", dueAt: "2026-10-10", assigneeId: admin.user.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, r.data.deliverableId) });
    expect(d).toMatchObject({ projectId: projA, status: "todo", priority: "high", dueAt: "2026-10-10", visibleToClient: false });
    expect(d?.description).toContain("Acompanhamento");
    expect((await listActionItems(admin, meetingId)).map((i) => i.title)).toEqual(["Enviar cronograma revisado"]);
    expect((await getDeliverableOrigin(admin, r.data.deliverableId))?.id).toBe(meetingId);
    const backlog = await listBacklog(admin, { today: "2026-10-01" });
    expect(backlog.some((b) => b.id === r.data.deliverableId)).toBe(true);
  });

  it("pode ir para outro projeto da mesma empresa, nunca de outra", async () => {
    expect((await addActionItem(admin, { meetingId, projectId: projA2, title: "Ajustar A2" })).ok).toBe(true);
    const r = await addActionItem(admin, { meetingId, projectId: projB, title: "Vazamento" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.projectId).toBeDefined();
  });

  it("não troca a ata de empresa depois de ter itens", async () => {
    const r = await updateMeeting(admin, meetingId, { ...base, title: "Acompanhamento", projectId: projB });
    expect(r.ok).toBe(false);
  });

  it("excluir a ata mantém as entregas", async () => {
    const r = await createMeeting(admin, { ...base, title: "Temporária", projectId: projA });
    if (!r.ok) throw new Error(r.error);
    const item = await addActionItem(admin, { meetingId: r.data.id, projectId: projA, title: "Sobrevive à ata" });
    if (!item.ok) throw new Error(item.error);
    expect((await deleteMeeting(admin, r.data.id)).ok).toBe(true);
    expect(await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, item.data.deliverableId) })).toBeDefined();
    expect(await getDeliverableOrigin(admin, item.data.deliverableId)).toBeNull();
  });
});

describe("portal", () => {
  let sharedId: string;
  let privateId: string;
  beforeAll(async () => {
    const s = await createMeeting(admin, { ...base, title: "Ata compartilhada", projectId: projA, externals: "Ana — Empresa A" });
    const p = await createMeeting(admin, { ...base, title: "Ata interna", projectId: projA });
    if (!s.ok || !p.ok) throw new Error("setup");
    sharedId = s.data.id;
    privateId = p.data.id;
    await addActionItem(admin, { meetingId: sharedId, projectId: projA, title: "Item visível", visibleToClient: true });
    await addActionItem(admin, { meetingId: sharedId, projectId: projA, title: "Item interno" });
    expect((await setMeetingShared(admin, sharedId, true)).ok).toBe(true);
  });

  it("cliente vê só atas compartilhadas da própria organização", async () => {
    const titles = (await listPortalMeetings(ctxA)).map((m) => m.title);
    expect(titles).toContain("Ata compartilhada");
    expect(titles).not.toContain("Ata interna");
    expect(await getPortalMeeting(ctxA, privateId)).toBeNull();
    expect(await listPortalMeetings(ctxB)).toEqual([]);
    expect(await getPortalMeeting(ctxB, sharedId)).toBeNull();
  });

  it("ata do portal traz participantes e só itens de entregas visíveis", async () => {
    const m = await getPortalMeeting(ctxA, sharedId);
    expect(m?.participants.map((p) => p.name)).toEqual(["Ana"]);
    expect((await listPortalActionItems(ctxA, sharedId)).map((i) => i.title)).toEqual(["Item visível"]);
    expect(await listPortalActionItems(ctxB, sharedId)).toEqual([]);
  });

  it("não compartilha ata de empresa sem portal; deixar de compartilhar esconde", async () => {
    const r = await createMeeting(admin, { ...base, companyId: companyNoPortal });
    if (!r.ok) throw new Error(r.error);
    expect((await setMeetingShared(admin, r.data.id, true)).ok).toBe(false);
    expect((await setMeetingShared(admin, sharedId, false)).ok).toBe(true);
    expect(await getPortalMeeting(ctxA, sharedId)).toBeNull();
  });
});

describe("trocar a ata de empresa", () => {
  it("ata compartilhada deixa de ser compartilhada ao ir para outra empresa", async () => {
    const r = await createMeeting(admin, { title: "Ata que muda de cliente", heldAt: "2026-10-03T10:00", projectId: projA });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((await setMeetingShared(admin, r.data.id, true)).ok).toBe(true);
    expect((await listPortalMeetings(ctxA)).map((m) => m.id)).toContain(r.data.id);

    const moved = await updateMeeting(admin, r.data.id, { title: "Ata que muda de cliente", heldAt: "2026-10-03T10:00", projectId: projB });
    expect(moved.ok).toBe(true);
    const row = await db.query.meeting.findFirst({ where: eq(meeting.id, r.data.id) });
    expect(row?.companyId).toBe(companyB);
    expect(row?.sharedWithClient).toBe(false);
    expect((await listPortalMeetings(ctxB)).map((m) => m.id)).not.toContain(r.data.id);
    expect((await listPortalMeetings(ctxA)).map((m) => m.id)).not.toContain(r.data.id);
  });

  it("editar sem trocar de empresa mantém o compartilhamento", async () => {
    const r = await createMeeting(admin, { title: "Ata que fica", heldAt: "2026-10-04T10:00", projectId: projA });
    if (!r.ok) throw new Error(r.error);
    await setMeetingShared(admin, r.data.id, true);
    expect((await updateMeeting(admin, r.data.id, { title: "Ata que fica (revisada)", heldAt: "2026-10-04T10:00", projectId: projA2 })).ok).toBe(true);
    expect((await db.query.meeting.findFirst({ where: eq(meeting.id, r.data.id) }))?.sharedWithClient).toBe(true);
  });
});
