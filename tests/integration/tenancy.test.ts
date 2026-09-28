import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, memberships, users } from "@/db/schema";
import {
  createOrganization,
  inviteUser,
  acceptInvitation,
  setUserActive,
  setOrganizationStatus,
} from "@/modules/tenancy/actions";
import { getInvitationByToken, listOrganizationMembers, listPendingInvitations } from "@/modules/tenancy/queries";
import { listUserOrganizations } from "@/modules/auth/context";
import { hashToken } from "@/modules/tenancy/tokens";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "./setup";

let ctx: AdminContext;
beforeAll(async () => {
  ctx = await ensureTestAdmin();
});

/** Substitui o hash do convite por um token conhecido (o bruto só existe no e-mail). */
async function forceToken(invitationId: string, raw: string) {
  await db.update(invitations).set({ tokenHash: hashToken(raw) }).where(eq(invitations.id, invitationId));
}

describe("tenancy", () => {
  it("cria organização, convida, aceita e bloqueia segundo aceite", async () => {
    const org = await createOrganization(ctx, { name: "Empresa Teste" });
    expect(org.ok).toBe(true);
    if (!org.ok) return;

    const inv = await inviteUser(ctx, { email: " Pessoa@Test.local ", organizationId: org.data.id });
    expect(inv.ok).toBe(true);
    if (!inv.ok) return;
    const row = await db.query.invitations.findFirst({ where: eq(invitations.id, inv.data.invitationId) });
    expect(row!.email).toBe("pessoa@test.local");
    expect((await listPendingInvitations(ctx, org.data.id)).length).toBe(1);

    const raw = "token-de-teste-conhecido-com-mais-de-vinte-chars";
    await forceToken(inv.data.invitationId, raw);
    expect(await getInvitationByToken(raw)).not.toBeNull();

    const acc = await acceptInvitation({ token: raw, name: "Pessoa", password: "senha-forte-1234" }, new Headers());
    expect(acc.ok).toBe(true);
    if (acc.ok) expect(acc.data.existingUser).toBe(false);

    const members = await listOrganizationMembers(ctx, org.data.id);
    expect(members.map((m) => m.email)).toEqual(["pessoa@test.local"]);
    const created = await db.query.users.findFirst({ where: eq(users.email, "pessoa@test.local") });
    expect(created?.role).toBe("client");

    const again = await acceptInvitation({ token: raw, name: "Pessoa", password: "senha-forte-1234" }, new Headers());
    expect(again.ok).toBe(false);
    expect((await listPendingInvitations(ctx, org.data.id)).length).toBe(0);
  });

  it("convite para usuário existente só cria a membership (sem nova conta)", async () => {
    const a = await createOrganization(ctx, { name: "Org A" });
    const b = await createOrganization(ctx, { name: "Org B" });
    if (!a.ok || !b.ok) throw new Error("setup");

    const inv1 = await inviteUser(ctx, { email: "dupla@test.local", organizationId: a.data.id });
    if (!inv1.ok) throw new Error("setup");
    await forceToken(inv1.data.invitationId, "token-org-a-conhecido-com-mais-de-vinte-chars");
    await acceptInvitation(
      { token: "token-org-a-conhecido-com-mais-de-vinte-chars", name: "Dupla", password: "senha-forte-1234" },
      new Headers(),
    );

    const inv2 = await inviteUser(ctx, { email: "dupla@test.local", organizationId: b.data.id });
    if (!inv2.ok) throw new Error("setup");
    await forceToken(inv2.data.invitationId, "token-org-b-conhecido-com-mais-de-vinte-chars");
    const acc2 = await acceptInvitation(
      { token: "token-org-b-conhecido-com-mais-de-vinte-chars", name: "existente", password: "nao-usado-1" },
      new Headers(),
    );
    expect(acc2.ok).toBe(true);
    if (acc2.ok) expect(acc2.data.existingUser).toBe(true);

    const user = await db.query.users.findFirst({ where: eq(users.email, "dupla@test.local") });
    const orgs = await listUserOrganizations(user!.id);
    expect(orgs.map((o) => o.name).sort()).toEqual(["Org A", "Org B"]);

    const dup = await inviteUser(ctx, { email: "dupla@test.local", organizationId: a.data.id });
    expect(dup.ok).toBe(false);
  });

  it("convite expirado não é encontrado", async () => {
    const org = await createOrganization(ctx, { name: "Outra" });
    if (!org.ok) throw new Error("setup");
    const raw = "token-expirado-conhecido-com-mais-de-vinte-chars";
    await db.insert(invitations).values({
      email: "x@test.local",
      organizationId: org.data.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() - 1000),
      invitedBy: ctx.user.id,
    });
    expect(await getInvitationByToken(raw)).toBeNull();
  });

  it("slug duplicado é rejeitado", async () => {
    await createOrganization(ctx, { name: "Dup" });
    const r = await createOrganization(ctx, { name: "Dup" });
    expect(r.ok).toBe(false);
  });

  it("desativar usuário apaga sessões e não permite desativar a si mesmo", async () => {
    const org = await createOrganization(ctx, { name: "Sessoes" });
    if (!org.ok) throw new Error("setup");
    const inv = await inviteUser(ctx, { email: "sessao@test.local", organizationId: org.data.id });
    if (!inv.ok) throw new Error("setup");
    await forceToken(inv.data.invitationId, "token-sessao-conhecido-com-mais-de-vinte-chars");
    await acceptInvitation(
      { token: "token-sessao-conhecido-com-mais-de-vinte-chars", name: "Sessao", password: "senha-forte-1234" },
      new Headers(),
    );
    const user = await db.query.users.findFirst({ where: eq(users.email, "sessao@test.local") });

    const r = await setUserActive(ctx, user!.id, false);
    expect(r.ok).toBe(true);
    expect((await db.query.users.findFirst({ where: eq(users.id, user!.id) }))?.active).toBe(false);

    const self = await setUserActive(ctx, ctx.user.id, false);
    expect(self.ok).toBe(false);
  });

  it("organização inativa não aparece como ativa para o membro", async () => {
    const org = await createOrganization(ctx, { name: "Inativa" });
    if (!org.ok) throw new Error("setup");
    const inv = await inviteUser(ctx, { email: "inativa@test.local", organizationId: org.data.id });
    if (!inv.ok) throw new Error("setup");
    await forceToken(inv.data.invitationId, "token-inativa-conhecido-com-mais-de-vinte-chars");
    await acceptInvitation(
      { token: "token-inativa-conhecido-com-mais-de-vinte-chars", name: "Inativa", password: "senha-forte-1234" },
      new Headers(),
    );
    await setOrganizationStatus(ctx, org.data.id, "inactive");
    const user = await db.query.users.findFirst({ where: eq(users.email, "inativa@test.local") });
    const orgs = await listUserOrganizations(user!.id);
    expect(orgs[0].status).toBe("inactive");
    expect(await db.query.memberships.findFirst({ where: eq(memberships.userId, user!.id) })).toBeTruthy();
  });
});
