import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listLeads } from "@/modules/leads/queries";
import { markLeadSeenForm } from "@/modules/leads/form-actions";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Leads" };

const FILTROS = [
  { key: "new", label: "Novos" },
  { key: "seen", label: "Vistos" },
  { key: "all", label: "Todos" },
] as const;

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const status = sp.status === "seen" ? "seen" : sp.status === "all" ? "all" : "new";
  const leads = await listLeads(ctx, status === "all" ? {} : { status });

  return (
    <>
      <PageHeader title="Leads" meta="Mensagens recebidas pelo formulário de contato do site." />
      <nav className="flex gap-1 border-b border-border" aria-label="Filtro">
        {FILTROS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/leads?status=${f.key}`}
            aria-current={status === f.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground", status === f.key && "border-foreground text-foreground")}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {leads.length === 0 ? (
          <EmptyState title="Nenhum lead recebido pelo site ainda." text="Quando alguém enviar o formulário de contato, ele aparece aqui." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 font-medium">E-mail</th>
                <th className="h-10 px-4 font-medium">Empresa</th>
                <th className="h-10 px-4 font-medium">Mensagem</th>
                <th className="h-10 px-4 font-medium">Recebido em</th>
                <th className="h-10 px-4" />
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {l.name}
                    {l.status === "new" && <span className="ml-2 inline-flex h-5 items-center rounded-sm bg-signal-soft px-1.5 text-[0.75rem] font-medium text-signal-strong">Novo</span>}
                    {l.phone && <div className="type-data mt-0.5 font-normal text-faint">{l.phone}</div>}
                  </td>
                  <td className="type-data px-4 py-3">
                    <a href={`mailto:${l.email}`} className="hover:text-signal-strong">{l.email}</a>
                  </td>
                  <td className="px-4 py-3">{l.company ?? <span className="text-faint">—</span>}</td>
                  <td className="max-w-[28rem] px-4 py-3 text-muted-foreground">
                    <details>
                      <summary className="cursor-pointer truncate">{l.message}</summary>
                      <p className="mt-2 whitespace-pre-wrap text-foreground">{l.message}</p>
                    </details>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {l.status === "new" && (
                      <form action={markLeadSeenForm}>
                        <input type="hidden" name="id" value={l.id} />
                        <Button type="submit" variant="link" size="sm">
                          Marcar como visto
                        </Button>
                      </form>
                    )}
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
