import { and, asc, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, memberships, invitations, users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { hashToken } from "./tokens";
import { isUuid } from "@/lib/uuid";

export const listOrganizations = (_ctx: AdminContext) =>
  db.select().from(organizations).orderBy(asc(organizations.name));

export const getOrganization = (_ctx: AdminContext, id: string) =>
  isUuid(id) ? db.query.organizations.findFirst({ where: eq(organizations.id, id) }) : Promise.resolve(undefined);

export const countOrganizations = async () => (await db.select({ n: count() }).from(organizations))[0].n;

export const listOrganizationMembers = (_ctx: AdminContext, orgId: string) =>
  db
    .select({ id: users.id, name: users.name, email: users.email, active: users.active })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, orgId))
    .orderBy(asc(users.name));

export const listPendingInvitations = (_ctx: AdminContext, orgId: string) =>
  db
    .select({
      id: invitations.id,
      email: invitations.email,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(and(eq(invitations.organizationId, orgId), isNull(invitations.acceptedAt)))
    .orderBy(asc(invitations.createdAt));

/** Convite válido (existe, não aceito, não expirado) a partir do token bruto. Público: usado pela página /convite. */
export async function getInvitationByToken(raw: string) {
  const [row] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      organizationId: invitations.organizationId,
      organizationName: organizations.name,
      /** convite da equipe da EGD (Fase 17): sem organização, com papel */
      role: invitations.role,
    })
    .from(invitations)
    .leftJoin(organizations, eq(invitations.organizationId, organizations.id))
    .where(
      and(
        eq(invitations.tokenHash, hashToken(raw)),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}
