import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { crmCompany, crmOpportunity, memberships, notification, notificationPreference, organizations, project, projectDeliverable, users } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { notify } from "@/modules/notifications/notify";
import { notifyDeliverableDone, notifyTeamComment } from "@/modules/notifications/events";
import { markAllRead, openNotification, setPreference } from "@/modules/notifications/actions";
import { countUnread, listNotifications, listPreferences } from "@/modules/notifications/queries";
import { deleteOldNotifications } from "@/modules/notifications/cleanup";
import { createRequest } from "@/modules/requests/actions";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let admin2: { id: string; email: string; name: string };
let inactiveAdmin: { id: string };
let orgA: { id: string; name: string; slug: string; status: "active" | "inactive" };
let orgB: typeof orgA;
let clientA: PortalContext;
let clientA2: PortalContext;
let clientB: PortalContext;
let visibleId: string;
let hiddenId: string;

async function user(email: string, name: string, role: "admin" | "client", active = true) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role, active }, { method: "admin" });
  return { id: u.id, email, name };
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  admin2 = await user("notif-admin2@test.local", "Admin Dois", "admin");
  inactiveAdmin = await user("notif-inativo@test.local", "Inativo", "admin", false);
  [orgA] = await db.insert(organizations).values({ name: "Org A", slug: "org-a" }).returning();
  [orgB] = await db.insert(organizations).values({ name: "Org B", slug: "org-b" }).returning();
  const a = await user("notif-a@test.local", "Cliente A", "client");
  const a2 = await user("notif-a2@test.local", "Cliente A2", "client");
  const b = await user("notif-b@test.local", "Cliente B", "client");
  await db.insert(memberships).values([
    { userId: a.id, organizationId: orgA.id },
    { userId: a2.id, organizationId: orgA.id },
    { userId: b.id, organizationId: orgB.id },
  ]);
  const mk = (u: typeof a, org: typeof orgA): PortalContext => ({ kind: "portal", user: { ...u, role: "client", active: true }, organization: org, organizations: [org] });
  clientA = mk(a, orgA);
  clientA2 = mk(a2, orgA);
  clientB = mk(b, orgB);

  const [company] = await db.insert(crmCompany).values({ name: "Empresa A", slug: "empresa-a", ownerId: admin.user.id, linkedOrganizationId: orgA.id }).returning({ id: crmCompany.id });
  const [opp] = await db.insert(crmOpportunity).values({ companyId: company.id, title: "Op", stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId: company.id, title: "Projeto A", status: "active", ownerId: admin.user.id }).returning({ id: project.id });
  const [v] = await db.insert(projectDeliverable).values({ projectId: p.id, title: "Visível", ownerId: admin.user.id, visibleToClient: true }).returning({ id: projectDeliverable.id });
  const [h] = await db.insert(projectDeliverable).values({ projectId: p.id, title: "Interna", ownerId: admin.user.id, visibleToClient: false }).returning({ id: projectDeliverable.id });
  visibleId = v.id;
  hiddenId = h.id;
});

const mail = { subject: "Teste", text: "t", html: "<p>t</p>" };

describe("notify", () => {
  it("cria uma linha por destinatário, pula quem causou e manda e-mail a quem não desligou", async () => {
    await db.delete(notification);
    const r = await notify({
      kind: "request.created",
      title: "Nova solicitação",
      url: "/admin/solicitacoes/x",
      recipients: [
        { id: admin.user.id, email: admin.user.email, name: admin.user.name },
        admin2,
        { id: clientA.user.id, email: clientA.user.email, name: "causador" },
      ],
      excludeUserId: clientA.user.id,
      mail,
    });
    expect(r.inApp).toBe(2);
    expect(r.emailed).toBe(2);
    expect(r.failed).toBe(0);
    expect(await countUnread(admin.user.id)).toBe(1);
    expect(await countUnread(clientA.user.id)).toBe(0);
  });

  it("preferência desligada zera o e-mail mas mantém a notificação no sistema", async () => {
    await db.delete(notification);
    const pref = await setPreference(admin, "request.created", false);
    expect(pref.ok).toBe(true);
    expect((await listPreferences(admin.user.id))["request.created"]).toBe(false);
    const r = await notify({ kind: "request.created", title: "x", url: "/x", recipients: [{ id: admin.user.id, email: admin.user.email, name: "A" }], mail });
    expect(r.inApp).toBe(1);
    expect(r.emailed).toBe(0);
    await setPreference(admin, "request.created", true);
  });

  it("tipo não e-mailável nunca manda e-mail; preferência de outro público é recusada", async () => {
    const r = await notify({ kind: "proposal.expired", title: "x", url: "/x", recipients: [admin2], mail });
    expect(r.emailed).toBe(0);
    expect((await setPreference(admin, "request.team_reply", false)).ok).toBe(false);
    expect((await setPreference(clientA, "request.created", false)).ok).toBe(false);
    expect((await setPreference(admin, "proposal.expired", false)).ok).toBe(false);
  });
});

describe("eventos", () => {
  it("solicitação criada notifica os admins ativos (não o inativo, não o cliente)", async () => {
    await db.delete(notification);
    const r = await createRequest(clientA, { title: "Acesso", body: "Preciso de acesso ao servidor.", projectId: "" });
    expect(r.ok).toBe(true);
    const rows = await db.select().from(notification).where(eq(notification.kind, "request.created"));
    // o banco de teste pode ter outros admins (o do seed dos E2E): checa inclusão e exclusão, não o conjunto exato
    const ids = rows.map((n) => n.userId);
    expect(ids).toContain(admin.user.id);
    expect(ids).toContain(admin2.id);
    expect(ids).not.toContain(inactiveAdmin.id);
    expect(ids).not.toContain(clientA.user.id);
    expect(rows[0].organizationId).toBe(orgA.id);
    expect(rows[0].url).toMatch(/^\/admin\/solicitacoes\//);
  });

  it("comentário da equipe em entrega interna não notifica; em visível notifica só a organização dona", async () => {
    await db.delete(notification);
    expect(await notifyTeamComment({ deliverableId: hiddenId, body: "oi", actorId: admin.user.id })).toBeNull();
    expect(await db.select().from(notification)).toHaveLength(0);

    const r = await notifyTeamComment({ deliverableId: visibleId, body: "oi", actorId: admin.user.id });
    expect(r?.inApp).toBe(2);
    const rows = await db.select().from(notification).where(eq(notification.kind, "comment.team"));
    expect(rows.map((n) => n.userId).sort()).toEqual([clientA.user.id, clientA2.user.id].sort());
    expect(await countUnread(clientB.user.id)).toBe(0);
    expect(rows[0].url).toBe(`/portal/projetos/${rows[0].url.split("/")[3]}/entregas/${visibleId}`);
  });

  it("entrega concluída avisa os membros; membro de organização inativa não recebe", async () => {
    await db.delete(notification);
    await db.update(organizations).set({ status: "inactive" }).where(eq(organizations.id, orgA.id));
    expect((await notifyDeliverableDone({ deliverableId: visibleId, hasFile: false, actorId: admin.user.id }))?.inApp).toBe(0);
    await db.update(organizations).set({ status: "active" }).where(eq(organizations.id, orgA.id));
    expect((await notifyDeliverableDone({ deliverableId: visibleId, hasFile: true, actorId: admin.user.id }))?.inApp).toBe(2);
  });
});

describe("leitura", () => {
  it("abrir marca lida só para o dono; de outro usuário devolve null", async () => {
    await db.delete(notification);
    await notify({ kind: "request.team_reply", title: "x", url: "/portal/solicitacoes/1", recipients: [{ id: clientA.user.id, email: clientA.user.email, name: "A" }] });
    const [n] = await listNotifications(clientA.user.id);
    expect(await openNotification(clientB, n.id)).toBeNull();
    expect(await countUnread(clientA.user.id)).toBe(1);
    expect(await openNotification(clientA, n.id)).toEqual({ url: "/portal/solicitacoes/1" });
    expect(await countUnread(clientA.user.id)).toBe(0);
    // abrir de novo (já lida) continua devolvendo a url
    expect(await openNotification(clientA, n.id)).toEqual({ url: "/portal/solicitacoes/1" });
    expect(await openNotification(clientA, "nao-uuid")).toBeNull();
  });

  it("marcar todas como lidas só mexe nas do próprio usuário", async () => {
    await db.delete(notification);
    const rec = (c: PortalContext) => ({ id: c.user.id, email: c.user.email, name: c.user.name });
    await notify({ kind: "request.team_reply", title: "x", url: "/x", recipients: [rec(clientA), rec(clientB)] });
    await notify({ kind: "deliverable.done", title: "y", url: "/y", recipients: [rec(clientA)] });
    const r = await markAllRead(clientA);
    expect(r.ok && r.data.marked).toBe(2);
    expect(await countUnread(clientA.user.id)).toBe(0);
    expect(await countUnread(clientB.user.id)).toBe(1);
    expect((await listNotifications(clientA.user.id, { unreadOnly: true })).length).toBe(0);
  });

  it("limpeza apaga lidas antigas e não lidas muito antigas, mantém o resto", async () => {
    await db.delete(notification);
    const uid = clientA.user.id;
    const day = 86_400_000;
    const now = new Date();
    await db.insert(notification).values([
      { userId: uid, kind: "x", title: "lida velha", url: "/", readAt: now, createdAt: new Date(now.getTime() - 100 * day) },
      { userId: uid, kind: "x", title: "lida recente", url: "/", readAt: now, createdAt: new Date(now.getTime() - 10 * day) },
      { userId: uid, kind: "x", title: "nao lida velha", url: "/", createdAt: new Date(now.getTime() - 200 * day) },
      { userId: uid, kind: "x", title: "nao lida 100d", url: "/", createdAt: new Date(now.getTime() - 100 * day) },
    ]);
    const r = await deleteOldNotifications(now);
    expect(r.deleted).toBe(2);
    const left = (await db.select({ title: notification.title }).from(notification).where(eq(notification.userId, uid))).map((n) => n.title).sort();
    expect(left).toEqual(["lida recente", "nao lida 100d"]);
  });
});

it("preferência: upsert mantém uma linha por (usuário, tipo)", async () => {
  await setPreference(admin2 && { kind: "admin", user: { ...admin2, role: "admin", active: true } }, "lead.created", false);
  await setPreference({ kind: "admin", user: { ...admin2, role: "admin", active: true } }, "lead.created", true);
  const rows = await db.select().from(notificationPreference).where(and(eq(notificationPreference.userId, admin2.id), eq(notificationPreference.kind, "lead.created")));
  expect(rows).toHaveLength(1);
  expect(rows[0].email).toBe(true);
  expect(await db.select({ id: users.id }).from(users).where(eq(users.id, admin2.id))).toHaveLength(1);
});
