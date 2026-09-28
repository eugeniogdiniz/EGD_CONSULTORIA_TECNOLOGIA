import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listCompanies } from "@/modules/crm/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Empresas" };

const SOURCE_LABEL: Record<string, string> = {
  outbound: "Prospecção",
  site_contact: "Site",
  referral: "Indicação",
  event: "Evento",
  other: "Outra",
};

export default async function EmpresasPage({ searchParams }: PageProps<"/admin/crm/empresas">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const includeArchived = sp.archived === "1";
  const rows = await listCompanies(ctx, { search: search || undefined, includeArchived });

  return (
    <>
      <PageHeader
        title="Empresas"
        meta="Cadastro comercial da EGD. Empresas arquivadas mantêm oportunidades abertas visíveis no funil."
        actions={
          <Button variant="secondary" size="sm" render={<Link href="/admin/crm/empresas/nova" />}>
            Nova empresa
          </Button>
        }
      />

      <form className="flex flex-wrap items-center gap-3" action="/admin/crm/empresas">
        <div className="grow max-w-md">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por nome, CNPJ ou site"
            className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
          />
        </div>
        <label className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} />
          Mostrar arquivadas
        </label>
        <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState
            title="Nenhuma empresa cadastrada."
            text={search ? "Nada bate com essa busca. Ajuste ou limpe o filtro." : "Crie a primeira empresa pra começar a montar o funil."}
            action={
              <Button size="sm" render={<Link href="/admin/crm/empresas/nova" />}>
                Nova empresa
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 font-medium">CNPJ</th>
                <th className="h-10 px-4 font-medium">Origem</th>
                <th className="h-10 px-4 font-medium">Site</th>
                <th className="h-10 px-4 font-medium">Atualizada</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cn("border-t border-border align-top", r.archivedAt && "text-muted-foreground")}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <Link href={`/admin/crm/empresas/${r.id}`} className="hover:text-link">
                      {r.name}
                    </Link>
                    {r.archivedAt && (
                      <span className="ml-2 inline-flex h-5 items-center rounded-sm border border-border px-1.5 text-[0.75rem] text-muted-foreground">
                        arquivada
                      </span>
                    )}
                  </td>
                  <td className="type-data px-4 py-3">
                    {r.cnpj ? r.cnpj : <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-3">{SOURCE_LABEL[r.source] ?? r.source}</td>
                  <td className="type-data px-4 py-3">
                    {r.website ? (
                      <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer" className="hover:text-link">
                        {r.website}
                      </a>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
