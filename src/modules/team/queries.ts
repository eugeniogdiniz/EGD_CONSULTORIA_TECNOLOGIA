import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, sessions, users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";

export const TEAM_ROLES = ["admin", "collaborator"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export const isTeamRoleValue = (v: string): v is TeamRole => (TEAM_ROLES as readonly string[]).includes(v);
export const ROLE_LABEL: Record<TeamRole, string> = { admin: "Administrador", collaborator: "Colaborador" };

/** Equipe da EGD com 2FA e último login (última sessão criada). */
export function listTeam(_ctx: AdminContext) {
  const lastLogin = sql<Date | null>`(select max(s.created_at) from sessions s where s.user_id = ${users.id})`;
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, twoFactorEnabled: users.twoFactorEnabled, createdAt: users.createdAt, lastLoginAt: lastLogin })
    .from(users)
    .where(inArray(users.role, [...TEAM_ROLES]))
    .orderBy(desc(users.active), asc(users.name));
}

export function listPendingTeamInvitations(_ctx: AdminContext) {
  return db
    .select({ id: invitations.id, email: invitations.email, role: invitations.role, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt })
    .from(invitations)
    .where(and(isNull(invitations.organizationId), isNull(invitations.acceptedAt)))
    .orderBy(asc(invitations.createdAt));
}

export async function countActiveAdmins(): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "admin"), eq(users.active, true)));
  return r?.n ?? 0;
}

/** Quantos da equipe / clientes ativos ainda não ativaram o 2FA (para a tela de configurações). */
export async function countWithoutTwoFactor() {
  const rows = await db
    .select({ role: users.role, n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.active, true), sql`coalesce(${users.twoFactorEnabled}, false) = false`))
    .groupBy(users.role);
  const by = Object.fromEntries(rows.map((r) => [r.role, r.n]));
  return { team: (by.admin ?? 0) + (by.collaborator ?? 0), client: by.client ?? 0 };
}

// `sessions` referenciada só para o tipo do import permanecer usado em builds estritos
void sessions;
