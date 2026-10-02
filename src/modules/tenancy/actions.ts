import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { organizations, memberships, invitations, users } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import { auth } from "@/lib/auth";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { sendInvitationEmail } from "@/modules/mail/send";
import { organizationSchema, inviteSchema, acceptInvitationSchema, type OrganizationInput } from "./validation";
import { slugify } from "./slug";
import { generateToken } from "./tokens";
import { getInvitationByToken } from "./queries";
import { isUuid } from "@/lib/uuid";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createOrganization(
  ctx: AdminContext,
  input: OrganizationInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  if (!slug) return fail("Nome precisa ter letras ou números.", { name: ["Inválido"] });
  const dup = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
  if (dup) return fail("Já existe uma organização com esse identificador.", { slug: ["Em uso"] });

  const [row] = await db
    .insert(organizations)
    .values({ name: parsed.data.name, cnpj: parsed.data.cnpj, slug })
    .returning({ id: organizations.id });
  await audit({
    actorId: ctx.user.id,
    action: "organization.created",
    entityType: "organization",
    entityId: row.id,
    organizationId: row.id,
    metadata: { name: parsed.data.name, slug },
  });
  return ok({ id: row.id });
}

export async function updateOrganization(
  ctx: AdminContext,
  id: string,
  input: OrganizationInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Organização não encontrada.");
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  const dup = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
  if (dup && dup.id !== id) return fail("Identificador em uso.", { slug: ["Em uso"] });

  await db
    .update(organizations)
    .set({
      name: parsed.data.name,
      cnpj: parsed.data.cnpj,
      slug,
      ...(parsed.data.weeklyDigest === undefined ? {} : { weeklyDigest: parsed.data.weeklyDigest }),
    })
    .where(eq(organizations.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "organization.updated",
    entityType: "organization",
    entityId: id,
    organizationId: id,
    metadata: { name: parsed.data.name, slug, cnpj: parsed.data.cnpj, ...(parsed.data.weeklyDigest === undefined ? {} : { weeklyDigest: parsed.data.weeklyDigest }) },
  });
  return ok(null);
}

/**
 * Liga/desliga o andamento semanal por e-mail (Fase 13). O admin pode para
 * qualquer organização; um membro do portal, só para a organização ativa.
 */
export async function setOrganizationWeeklyDigest(
  ctx: AdminContext | PortalContext,
  id: string,
  enabled: boolean,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Organização não encontrada.");
  if (ctx.kind === "portal" && ctx.organization.id !== id) return fail("Organização não encontrada.");
  const [row] = await db.update(organizations).set({ weeklyDigest: enabled }).where(eq(organizations.id, id)).returning({ id: organizations.id });
  if (!row) return fail("Organização não encontrada.");
  await audit({
    actorId: ctx.user.id,
    action: "organization.updated",
    entityType: "organization",
    entityId: id,
    organizationId: id,
    metadata: { weeklyDigest: enabled, by: ctx.kind },
  });
  return ok(null);
}

export async function setOrganizationStatus(
  ctx: AdminContext,
  id: string,
  status: "active" | "inactive",
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Organização não encontrada.");
  await db.update(organizations).set({ status }).where(eq(organizations.id, id));
  await audit({
    actorId: ctx.user.id,
    action: status === "active" ? "organization.activated" : "organization.deactivated",
    entityType: "organization",
    entityId: id,
    organizationId: id,
  });
  return ok(null);
}

export async function inviteUser(
  ctx: AdminContext,
  input: { email: string; organizationId: string },
): Promise<ActionResult<{ invitationId: string }>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, parsed.data.organizationId) });
  if (!org) return fail("Organização não encontrada.");

  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (existing) {
    const member = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, existing.id), eq(memberships.organizationId, org.id)),
    });
    if (member) return fail("Essa pessoa já é membro desta organização.", { email: ["Já é membro"] });
  }

  const { raw, hash } = generateToken();
  const [inv] = await db
    .insert(invitations)
    .values({
      email: parsed.data.email,
      organizationId: org.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedBy: ctx.user.id,
    })
    .returning({ id: invitations.id });

  await sendInvitationEmail({
    to: parsed.data.email,
    organizationName: org.name,
    acceptUrl: `${env.BETTER_AUTH_URL}/convite/${raw}`,
  });
  await audit({
    actorId: ctx.user.id,
    action: "invitation.sent",
    entityType: "invitation",
    entityId: inv.id,
    organizationId: org.id,
    metadata: { email: parsed.data.email },
  });
  return ok({ invitationId: inv.id });
}

export async function resendInvitation(ctx: AdminContext, invitationId: string): Promise<ActionResult<null>> {
  if (!isUuid(invitationId)) return fail("Convite não encontrado ou já aceito.");
  const inv = await db.query.invitations.findFirst({ where: eq(invitations.id, invitationId) });
  if (!inv || inv.acceptedAt) return fail("Convite não encontrado ou já aceito.");
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, inv.organizationId) });
  if (!org) return fail("Organização não encontrada.");

  const { raw, hash } = generateToken();
  await db
    .update(invitations)
    .set({ tokenHash: hash, expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
    .where(eq(invitations.id, inv.id));
  await sendInvitationEmail({
    to: inv.email,
    organizationName: org.name,
    acceptUrl: `${env.BETTER_AUTH_URL}/convite/${raw}`,
  });
  await audit({
    actorId: ctx.user.id,
    action: "invitation.resent",
    entityType: "invitation",
    entityId: inv.id,
    organizationId: inv.organizationId,
  });
  return ok(null);
}

/**
 * Aceita um convite. Usuário novo: cria a conta pelo Better Auth (o hook
 * exige o token) e a sessão já vem nos cookies. Usuário existente: só cria a
 * membership; nome e senha recebidos são ignorados.
 */
export async function acceptInvitation(
  input: { token: string; name: string; password: string },
  requestHeaders: Headers,
): Promise<ActionResult<{ organizationId: string; existingUser: boolean }>> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const inv = await getInvitationByToken(parsed.data.token);
  if (!inv) return fail("Convite inválido ou expirado. Peça um novo convite.");

  const existing = await db.query.users.findFirst({ where: eq(users.email, inv.email) });
  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    try {
      const res = await auth.api.signUpEmail({
        body: {
          name: parsed.data.name,
          email: inv.email,
          password: parsed.data.password,
          invitationToken: parsed.data.token,
        } as never,
        headers: requestHeaders,
      });
      userId = res.user.id;
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "Não foi possível criar a conta.";
      return fail(msg, { password: [msg] });
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(memberships).values({ userId, organizationId: inv.organizationId }).onConflictDoNothing();
    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id));
  });
  await audit({
    actorId: userId,
    action: "invitation.accepted",
    entityType: "invitation",
    entityId: inv.id,
    organizationId: inv.organizationId,
  });
  return ok({ organizationId: inv.organizationId, existingUser: Boolean(existing) });
}

export async function setUserActive(ctx: AdminContext, userId: string, active: boolean): Promise<ActionResult<null>> {
  if (!isUuid(userId)) return fail("Usuário não encontrado.");
  if (userId === ctx.user.id) return fail("Você não pode desativar a própria conta.");
  await db.update(users).set({ active }).where(eq(users.id, userId));
  if (!active) {
    const authCtx = await auth.$context;
    await authCtx.internalAdapter.deleteUserSessions(userId);
  }
  await audit({
    actorId: ctx.user.id,
    action: active ? "user.activated" : "user.deactivated",
    entityType: "user",
    entityId: userId,
  });
  return ok(null);
}
