import Link from "next/link";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { listLeads } from "@/modules/leads/queries";
import { markLeadSeenForm } from "@/modules/leads/form-actions";
import { suggestCompanyByEmailDomain } from "@/modules/crm/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ConvertLeadDialog } from "@/modules/crm/components/convert-lead-dialog";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Leads" };

const FILTROS = [
  { key: "new", label: "Novos" },
  { key: "seen", label: "Vistos" },
  { key: "converted", label: "Convertidos" },
  { key: "all", label: "Todos" },
] as const;

type FilterKey = (typeof FILTROS)[number]["key"];

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const ctx = await requireOwner();
  const sp = await searchParams;
  const status: FilterKey = FILTROS.find((f) => f.key === sp.status)?.key ?? "new";
  const leads = await listLeads(ctx, status === "all" ? {} : { status });

  // Sugere empresa por domínio nos leads que ainda podem ser convertidos.
  // 1 query por lead — só rodamos nos abas que os têm.
  const suggestions = await Promise.all(
    leads.map((l) => (l.status === "converted" ? null : suggestCompanyByEmailDomain(ctx, l.email))),
  );

  return (
    <>
      <PageHeader title="Leads" meta="Mensagens recebidas pelo formulário de contato do site." />
      <nav className="flex gap-1 border-b border-border" aria-label="Filtro">
        {FILTROS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/leads?status=${f.key}`}
            aria-current={status === f.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
              status === f.key && "border-foreground text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        {leads.length === 0 ? (
          <EmptyState title="Nenhum lead nesse filtro." text="Novos leads chegam pelo formulário do site." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 font-medium">E-mail</th>
                <th className="h-10 px-4 font-medium">Empresa</th>
                <th className="h-10 px-4 font-medium">Mensagem</th>
                <th className="h-10 px-4 font-medium">Recebido em</th>
                <th className="h-10 px-4 font-medium">Convertido em</th>
                <th className="h-10 px-4"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l, idx) => (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {l.name}
                    {l.status === "new" && (
                      <span className="ml-2 inline-flex h-5 items-center rounded-sm bg-signal-soft px-1.5 text-[0.75rem] font-medium text-signal-strong">
                        Novo
                      </span>
                    )}
                    {l.phone && <div className="type-data mt-0.5 font-normal text-faint">{l.phone}</div>}
                  </td>
                  <td className="type-data px-4 py-3">
                    <a href={`mailto:${l.email}`} className="hover:text-signal-strong">
                      {l.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">{l.company ?? <span className="text-faint">—</span>}</td>
                  <td className="max-w-[28rem] px-4 py-3 text-muted-foreground">
                    <details>
                      <summary className="cursor-pointer truncate">{l.message}</summary>
                      <p className="mt-2 whitespace-pre-wrap text-foreground">{l.message}</p>
                    </details>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(l.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {l.convertedCompanyId ? (
                      <Link href={`/admin/crm/empresas/${l.convertedCompanyId}`} className="text-link hover:underline">
                        {l.convertedCompanyName ?? "empresa"}
                      </Link>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      {l.status === "new" && (
                        <form action={markLeadSeenForm}>
                          <input type="hidden" name="id" value={l.id} />
                          <Button type="submit" variant="link" size="sm">
                            Marcar como visto
                          </Button>
                        </form>
                      )}
                      {l.status !== "converted" && (
                        <ConvertLeadDialog
                          lead={{
                            id: l.id,
                            name: l.name,
                            email: l.email,
                            company: l.company,
                            phone: l.phone,
                            message: l.message,
                          }}
                          suggestion={suggestions[idx]}
                          trigger={
                            <Button variant="secondary" size="sm" type="button">
                              Converter
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
