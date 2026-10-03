import Link from "next/link";
import { requireOwner } from "@/modules/auth/context";
import { listOrganizations } from "@/modules/tenancy/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Status } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Organizações" };

export default async function OrganizacoesPage() {
  const ctx = await requireOwner();
  const orgs = await listOrganizations(ctx);
  return (
    <>
      <PageHeader title="Organizações" actions={<Button size="sm" render={<Link href="/admin/organizacoes/nova" />}>Nova organização</Button>} />
      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        {orgs.length === 0 ? (
          <EmptyState
            title="Nenhuma organização ainda."
            text="Crie a primeira para convidar clientes."
            action={<Button size="sm" render={<Link href="/admin/organizacoes/nova" />}>Nova organização</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 font-medium">Identificador</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-subtle">
                  <td className="h-11 px-4">
                    <Link href={`/admin/organizacoes/${o.id}`} className="font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong">
                      {o.name}
                    </Link>
                  </td>
                  <td className="type-data h-11 px-4">{o.slug}</td>
                  <td className="h-11 px-4">{o.status === "active" ? <Status tone="ok">Ativa</Status> : <Status tone="err">Inativa</Status>}</td>
                  <td className="h-11 px-4 text-muted-foreground">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
