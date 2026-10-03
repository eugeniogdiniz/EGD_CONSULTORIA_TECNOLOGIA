import Link from "next/link";
import { requireOwner } from "@/modules/auth/context";
import { listContacts } from "@/modules/crm/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Contatos" };

const ROLE_LABEL: Record<string, string> = {
  primary: "Principal",
  technical: "Técnico",
  financial: "Financeiro",
  other: "Outro",
};

export default async function ContatosPage({ searchParams }: PageProps<"/admin/crm/contatos">) {
  const ctx = await requireOwner();
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const rows = await listContacts(ctx, { search: search || undefined });

  return (
    <>
      <PageHeader
        title="Contatos"
        meta="Pessoas dentro das empresas do CRM. Um contato principal ativo por empresa."
      />

      <form className="flex flex-wrap items-center gap-3" action="/admin/crm/contatos">
        <div className="grow max-w-md">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por nome ou e-mail"
            className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
      </form>

      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState
            title="Nenhum contato encontrado."
            text={search ? "Nada bate com essa busca." : "Contatos são cadastrados no detalhe da empresa."}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 font-medium">Empresa</th>
                <th className="h-10 px-4 font-medium">Papel</th>
                <th className="h-10 px-4 font-medium">E-mail</th>
                <th className="h-10 px-4 font-medium">Telefone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {c.name}
                    {c.title && <div className="type-micro mt-0.5 font-normal text-muted-foreground">{c.title}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/crm/empresas/${c.companyId}`} className="text-link hover:underline">
                      {c.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ROLE_LABEL[c.role]}</td>
                  <td className="type-data px-4 py-3">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:text-signal-strong">
                        {c.email}
                      </a>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? <span className="text-faint">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
