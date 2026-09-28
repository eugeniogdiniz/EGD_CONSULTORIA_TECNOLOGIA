import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/db/schema";
import { resolveActiveOrganization, type OrgSummary } from "./resolve-organization";

export { resolveActiveOrganization, type OrgSummary };

export type SessionUser = { id: string; name: string; email: string; role: "admin" | "client"; active: boolean };
export type AdminContext = { kind: "admin"; user: SessionUser };
export type PortalContext = {
  kind: "portal";
  user: SessionUser;
  organization: OrgSummary;
  organizations: OrgSummary[];
};

/** Cookie com o id da organização ativa no portal. */
export const ORG_COOKIE = "egd_org";

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as unknown as SessionUser;
  if (!u.active) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active };
}

/** Exige sessão de admin. Sem sessão → login; cliente → 404 (não revela a área). */
export async function requireAdmin(): Promise<AdminContext> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/admin");
  if (user.role !== "admin") notFound();
  return { kind: "admin", user };
}

export async function listUserOrganizations(userId: string): Promise<OrgSummary[]> {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(organizations.name));
}

/** Exige sessão de cliente com ao menos uma organização ativa. Admin vai para /admin. */
export async function requirePortal(): Promise<PortalContext> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/portal");
  if (user.role === "admin") redirect("/admin");
  const orgs = await listUserOrganizations(user.id);
  const organization = resolveActiveOrganization(orgs, (await cookies()).get(ORG_COOKIE)?.value);
  if (!organization) redirect("/portal/sem-acesso");
  return {
    kind: "portal",
    user,
    organization,
    organizations: orgs.filter((o) => o.status === "active"),
  };
}
