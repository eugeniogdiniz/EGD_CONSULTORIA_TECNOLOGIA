import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/db/schema";
import { requireTwoFactorFor } from "@/modules/settings/queries";
import { resolveActiveOrganization, type OrgSummary } from "./resolve-organization";

export { resolveActiveOrganization, type OrgSummary };

export type Role = "admin" | "collaborator" | "client";
export type SessionUser = { id: string; name: string; email: string; role: Role; active: boolean; twoFactorEnabled?: boolean };
/** Equipe da EGD: dono (`admin`) ou colaborador. `kind` continua "admin" (nome histórico do contexto). */
export type AdminContext = { kind: "admin"; user: SessionUser & { role: "admin" | "collaborator" } };
export type PortalContext = {
  kind: "portal";
  user: SessionUser & { role: "client" };
  organization: OrgSummary;
  organizations: OrgSummary[];
};

/** Cookie com o id da organização ativa no portal. */
export const ORG_COOKIE = "egd_org";

export const isTeamRole = (r: Role): r is "admin" | "collaborator" => r === "admin" || r === "collaborator";
export const isOwner = (ctx: AdminContext) => ctx.user.role === "admin";

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as unknown as SessionUser;
  if (!u.active) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, twoFactorEnabled: Boolean(u.twoFactorEnabled) };
}

type Guard = { /** páginas que a pessoa pode abrir sem 2FA mesmo quando ele é obrigatório (Minha conta) */ allowWithout2fa?: boolean };

/**
 * Exige sessão da equipe (dono ou colaborador). Sem sessão → login; cliente → 404 (não revela a área).
 * Com "2FA obrigatório para a equipe" ligado, quem não ativou só abre Minha conta.
 */
export async function requireAdmin(opts: Guard = {}): Promise<AdminContext> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/admin");
  if (!isTeamRole(user.role)) notFound();
  if (!opts.allowWithout2fa && !user.twoFactorEnabled && (await requireTwoFactorFor(user.role))) redirect("/admin/conta?2fa=obrigatorio");
  return { kind: "admin", user: { ...user, role: user.role } };
}

/** Exige o dono (`admin`). Colaborador recebe 404, como o cliente. */
export async function requireOwner(opts: Guard = {}): Promise<AdminContext> {
  const ctx = await requireAdmin(opts);
  if (ctx.user.role !== "admin") notFound();
  return ctx;
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

/** Exige sessão de cliente com ao menos uma organização ativa. Equipe vai para /admin. */
export async function requirePortal(opts: Guard = {}): Promise<PortalContext> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/portal");
  if (isTeamRole(user.role)) redirect("/admin");
  if (!opts.allowWithout2fa && !user.twoFactorEnabled && (await requireTwoFactorFor("client"))) redirect("/portal/conta?2fa=obrigatorio");
  const orgs = await listUserOrganizations(user.id);
  const organization = resolveActiveOrganization(orgs, (await cookies()).get(ORG_COOKIE)?.value);
  if (!organization) redirect("/portal/sem-acesso");
  return {
    kind: "portal",
    user: { ...user, role: "client" },
    organization,
    organizations: orgs.filter((o) => o.status === "active"),
  };
}
