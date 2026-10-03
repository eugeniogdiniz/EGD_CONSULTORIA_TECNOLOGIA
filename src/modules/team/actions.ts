import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { invitations, users } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { normalizeEmail } from "@/modules/auth/normalize-email";
import { sendTeamInvitationEmail } from "@/modules/mail/send";
import { generateToken } from "@/modules/tenancy/tokens";
import { isUuid } from "@/lib/uuid";
import { auth } from "@/lib/auth";
import { countActiveAdmins, isTeamRoleValue, TEAM_ROLES, type TeamRole } from "./queries";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const teamInviteSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email("E-mail inválido")),
  role: z.enum(TEAM_ROLES),
});

/** Convida alguém para a equipe da EGD (sem organização). Usuário já da equipe é recusado. */
export async function inviteTeamMember(ctx: AdminContext, input: { email: string; role: string }): Promise<ActionResult<{ invitationId: string }>> {
  const parsed = teamInviteSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email), columns: { id: true, role: true } });
  if (existing && existing.role !== "client") return fail("Essa pessoa já faz parte da equipe.", { email: ["Já é da equipe"] });
  const pending = await db.query.invitations.findFirst({
    where: and(eq(invitations.email, parsed.data.email), isNull(invitations.organizationId), isNull(invitations.acceptedAt)),
    columns: { id: true },
  });
  if (pending) return fail("Já existe um convite pendente para este e-mail. Reenvie-o na lista abaixo.", { email: ["Convite pendente"] });

  const { raw, hash } = generateToken();
  const [inv] = await db
    .insert(invitations)
    .values({ email: parsed.data.email, organizationId: null, role: parsed.data.role, tokenHash: hash, expiresAt: new Date(Date.now() + INVITE_TTL_MS), invitedBy: ctx.user.id })
    .returning({ id: invitations.id });
  await sendTeamInvitationEmail({ to: parsed.data.email, role: parsed.data.role, acceptUrl: `${env.BETTER_AUTH_URL}/convite/${raw}`, invitedBy: ctx.user.name });
  await audit({ actorId: ctx.user.id, action: "team.invited", entityType: "invitation", entityId: inv.id, metadata: { role: parsed.data.role, existingClient: Boolean(existing) } });
  return ok({ invitationId: inv.id });
}

export async function resendTeamInvitation(ctx: AdminContext, invitationId: string): Promise<ActionResult<null>> {
  if (!isUuid(invitationId)) return fail("Convite não encontrado ou já aceito.");
  const inv = await db.query.invitations.findFirst({ where: and(eq(invitations.id, invitationId), isNull(invitations.organizationId)) });
  if (!inv || inv.acceptedAt || !inv.role) return fail("Convite não encontrado ou já aceito.");
  const { raw, hash } = generateToken();
  await db.update(invitations).set({ tokenHash: hash, expiresAt: new Date(Date.now() + INVITE_TTL_MS) }).where(eq(invitations.id, inv.id));
  await sendTeamInvitationEmail({ to: inv.email, role: inv.role as TeamRole, acceptUrl: `${env.BETTER_AUTH_URL}/convite/${raw}`, invitedBy: ctx.user.name });
  await audit({ actorId: ctx.user.id, action: "invitation.resent", entityType: "invitation", entityId: inv.id, metadata: { team: true } });
  return ok(null);
}

/** Muda o papel de alguém da equipe. Nunca o próprio; nunca rebaixa o último admin ativo. */
export async function setUserRole(ctx: AdminContext, userId: string, role: string): Promise<ActionResult<null>> {
  if (!isUuid(userId)) return fail("Usuário não encontrado.");
  if (!isTeamRoleValue(role)) return fail("Papel inválido.");
  if (userId === ctx.user.id) return fail("Você não pode mudar o próprio papel.");
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true, role: true, active: true } });
  if (!u || u.role === "client") return fail("Usuário não encontrado na equipe.");
  if (u.role === role) return ok(null);
  if (u.role === "admin" && u.active && (await countActiveAdmins()) <= 1) return fail("É o único administrador ativo. Promova outra pessoa antes.");
  await db.update(users).set({ role }).where(eq(users.id, userId));
  // o papel vive na sessão: encerra as sessões para a mudança valer já
  const authCtx = await auth.$context;
  await authCtx.internalAdapter.deleteUserSessions(userId);
  await audit({ actorId: ctx.user.id, action: "user.role_changed", entityType: "user", entityId: userId, metadata: { from: u.role, to: role } });
  return ok(null);
}
