import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getInvitationByToken } from "@/modules/tenancy/queries";
import { AcceptInviteForm, LinkExistingForm } from "@/modules/auth/components/accept-invite-form";
import { Button } from "@/components/ui/button";
import { SITE } from "@/content/site";

export const metadata: Metadata = { title: "Convite", robots: { index: false } };

export default async function ConvitePage({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const inv = await getInvitationByToken(token);

  if (!inv) {
    return (
      <>
        <h1 className="type-h3 mt-5 leading-tight">Este convite não é válido ou já expirou.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Peça um novo convite para a EGD. Convites valem por 7 dias e só podem ser usados uma vez.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" render={<Link href="/" />}>
            Ir para a página inicial
          </Button>
          <Button render={<a href={`mailto:${SITE.email}`} />}>Falar com a EGD</Button>
        </div>
      </>
    );
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, inv.email), columns: { id: true } });
  const team = inv.role === "admin" || inv.role === "collaborator";
  const target = team ? `equipe da EGD (${inv.role === "admin" ? "administrador" : "colaborador"})` : (inv.organizationName ?? "portal");
  return existing ? (
    <LinkExistingForm token={token} email={inv.email} organizationName={target} team={team} />
  ) : (
    <AcceptInviteForm token={token} email={inv.email} organizationName={target} team={team} />
  );
}
