export type OrgSummary = { id: string; name: string; slug: string; status: "active" | "inactive" };

/**
 * Escolhe a organização ativa do portal: a do cookie, se ainda for uma
 * organização ativa do usuário; senão a primeira ativa; null se não houver.
 * Função pura, sem acesso a request ou banco.
 */
export function resolveActiveOrganization(orgs: OrgSummary[], cookieValue: string | undefined): OrgSummary | null {
  const active = orgs.filter((o) => o.status === "active");
  return active.find((o) => o.id === cookieValue) ?? active[0] ?? null;
}
