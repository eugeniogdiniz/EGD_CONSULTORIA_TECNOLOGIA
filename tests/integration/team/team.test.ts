import { describe, it, expect, beforeAll } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { appSetting, auditLog, crmCompany, crmOpportunity, invitations, memberships, notification, organizations, project, projectDeliverable, users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { inviteTeamMember, setUserRole } from "@/modules/team/actions";
import { listPendingTeamInvitations, listTeam } from "@/modules/team/queries";
import { acceptInvitation } from "@/modules/tenancy/actions";
import { getInvitationByToken } from "@/modules/tenancy/queries";
import { hashToken } from "@/modules/tenancy/tokens";
import { getSetting, listSettings } from "@/modules/settings/queries";
import { setSetting } from "@/modules/settings/actions";
import { activeOwners, activeTeam } from "@/modules/notifications/recipients";
import { assignDeliverable, createDeliverable } from "@/modules/projects/actions";
import { listTeamMembers } from "@/modules/projects/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;

async function user(email: string, name: string, role: "admin" | "collaborator" | "client", active = true) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role, active }, { method: "admin" });
  return { id: u.id, email, name };
}

/** O token bruto não é devolvido pela action: recupera o convite pela auditoria e cria um token conhecido. */
async function tokenFor(invitationId: string) {
  const raw = `tok-${invitationId}-${Math.random().toString(36).slice(2)}`;
  await db.update(invitations).set({ tokenHash: hashToken(raw) }).where(eq(invitations.id, invitationId));
  return raw;
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  await db.delete(appSetting);
});

describe("convite da equipe", () => {
  it("cria convite com papel e sem organização; usuário novo vira colaborador sem membership", async () => {
    const email = `colab-${Date.now()}@test.local`;
    const r = await inviteTeamMember(admin, { email, role: "collaborator" });
    expect(r.ok).toBe(true);
    const pend = await listPendingTeamInvitations(admin);
    expect(pend.some((i) => i.email === email && i.role === "collaborator")).toBe(true);
    const raw = await tokenFor((r.ok && r.data.invitationId) as string);
    const inv = await getInvitationByToken(raw);
    expect(inv?.organizationId).toBeNull();
    expect(inv?.role).toBe("collaborator");

    const acc = await acceptInvitation({ token: raw, name: "Colab Um", password: "senha-colab-forte-123" }, new Headers());
    expect(acc.ok && acc.data.team).toBe(true);
    const u = await db.query.users.findFirst({ where: eq(users.email, email) });
    expect(u?.role).toBe("collaborator");
    expect(await db.select().from(memberships).where(eq(memberships.userId, u!.id))).toHaveLength(0);
    expect((await listTeam(admin)).some((t) => t.email === email)).toBe(true);
    expect((await listTeamMembers(admin)).some((t) => t.id === u!.id)).toBe(true);
  });

  it("recusa quem já é da equipe e convite pendente duplicado; cliente existente que aceita muda de papel", async () => {
    expect((await inviteTeamMember(admin, { email: admin.user.email, role: "admin" })).ok).toBe(false);
    const client = await user(`cli-${Date.now()}@test.local`, "Cliente", "client");
    const [org] = await db.insert(organizations).values({ name: "Org", slug: `org-${Date.now()}` }).returning();
    await db.insert(memberships).values({ userId: client.id, organizationId: org.id });
    const r = await inviteTeamMember(admin, { email: client.email, role: "admin" });
    expect(r.ok).toBe(true);
    expect((await inviteTeamMember(admin, { email: client.email, role: "admin" })).ok).toBe(false);
    const raw = await tokenFor((r.ok && r.data.invitationId) as string);
    const acc = await acceptInvitation({ token: raw, name: "existente", password: "nao-usado-1" }, new Headers());
    expect(acc.ok && acc.data.existingUser && acc.data.team).toBe(true);
    expect((await db.query.users.findFirst({ where: eq(users.id, client.id) }))?.role).toBe("admin");
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, client.id), eq(auditLog.action, "user.role_changed")));
    expect(audits).toHaveLength(1);
    expect(await db.select().from(invitations).where(and(eq(invitations.email, client.email), isNull(invitations.acceptedAt)))).toHaveLength(0);
  });
});

describe("papéis", () => {
  it("muda papel com auditoria; não muda o próprio; não rebaixa o último admin ativo", async () => {
    const c = await user(`c2-${Date.now()}@test.local`, "Colab Dois", "collaborator");
    expect((await setUserRole(admin, c.id, "admin")).ok).toBe(true);
    expect((await db.query.users.findFirst({ where: eq(users.id, c.id) }))?.role).toBe("admin");
    expect((await setUserRole(admin, admin.user.id, "collaborator")).ok).toBe(false);
    expect((await setUserRole(admin, c.id, "cliente")).ok).toBe(false);
    // rebaixa todos os outros admins; o último não pode cair
    const others = (await listTeam(admin)).filter((t) => t.role === "admin" && t.active && t.id !== c.id);
    for (const o of others) await db.update(users).set({ role: "collaborator" }).where(eq(users.id, o.id));
    const last = await setUserRole(admin, c.id, "collaborator");
    expect(last.ok).toBe(false);
    for (const o of others) await db.update(users).set({ role: "admin" }).where(eq(users.id, o.id));
    expect((await setUserRole(admin, c.id, "collaborator")).ok).toBe(true);
  });

  it("destinatários: equipe inclui colaborador ativo; donos não; inativo nunca", async () => {
    const c = await user(`c3-${Date.now()}@test.local`, "Colab Três", "collaborator");
    const inativo = await user(`c4-${Date.now()}@test.local`, "Inativo", "collaborator", false);
    const team = (await activeTeam()).map((r) => r.id);
    const owners = (await activeOwners()).map((r) => r.id);
    expect(team).toContain(c.id);
    expect(team).toContain(admin.user.id);
    expect(team).not.toContain(inativo.id);
    expect(owners).toContain(admin.user.id);
    expect(owners).not.toContain(c.id);
  });
});

describe("configurações", () => {
  it("padrão desligado; setSetting liga e audita; chave desconhecida é recusada", async () => {
    expect(await getSetting("security.require_2fa_team")).toBe(false);
    expect((await setSetting(admin, "security.require_2fa_team", true)).ok).toBe(true);
    expect(await getSetting("security.require_2fa_team")).toBe(true);
    expect((await listSettings())["security.require_2fa_client"]).toBe(false);
    expect((await setSetting(admin, "x.y", true)).ok).toBe(false);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "setting.updated"))).toHaveLength(1);
    await setSetting(admin, "security.require_2fa_team", false);
  });
});

describe("atribuição de entrega", () => {
  it("notifica quem foi atribuído por outra pessoa; não notifica quem se atribui", async () => {
    await db.delete(notification);
    const colab = await user(`c5-${Date.now()}@test.local`, "Colab Cinco", "collaborator");
    const [company] = await db.insert(crmCompany).values({ name: "Emp", slug: `emp-${Date.now()}`, ownerId: admin.user.id }).returning({ id: crmCompany.id });
    const [opp] = await db.insert(crmOpportunity).values({ companyId: company.id, title: "Op", stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
    const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId: company.id, title: "Proj", status: "active", ownerId: admin.user.id }).returning({ id: project.id });
    const created = await createDeliverable(admin, { projectId: p.id, phaseId: "", title: "Entrega X", description: "", assigneeId: colab.id, dueAt: "", priority: "medium" });
    expect(created.ok).toBe(true);
    let notes = await db.select().from(notification).where(eq(notification.kind, "deliverable.assigned"));
    expect(notes).toHaveLength(1);
    expect(notes[0].userId).toBe(colab.id);
    expect(notes[0].title).toContain("Entrega X");
    // reatribuir ao mesmo não repete; atribuir a si mesmo não notifica
    const id = (created.ok && created.data.id) as string;
    await assignDeliverable(admin, id, colab.id);
    await assignDeliverable(admin, id, admin.user.id);
    notes = await db.select().from(notification).where(eq(notification.kind, "deliverable.assigned"));
    expect(notes).toHaveLength(1);
    await db.delete(projectDeliverable).where(eq(projectDeliverable.id, id));
  });
});
