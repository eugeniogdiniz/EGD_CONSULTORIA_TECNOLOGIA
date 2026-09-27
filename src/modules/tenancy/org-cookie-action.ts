"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, listUserOrganizations, ORG_COOKIE } from "@/modules/auth/context";

/** Troca a organização ativa do portal. Só aceita organizações ativas das quais o usuário é membro. */
export async function setActiveOrganization(organizationId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const orgs = await listUserOrganizations(user.id);
  if (!orgs.some((o) => o.id === organizationId && o.status === "active")) return;
  (await cookies()).set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/portal");
}
