import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listProposals } from "@/modules/crm/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { formatBrlCents, formatDate } from "@/lib/format";

export const metadata = { title: "Propostas" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  expired: "Expirada",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "border-border bg-subtle text-muted-foreground",
  sent: "border-signal-strong bg-signal-soft text-signal-strong",
  accepted: "border-success bg-success-soft text-success",
  rejected: "border-danger bg-danger-soft text-danger",
  expired: "border-warning bg-warning-soft text-warning",
};

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "draft", label: "Rascunhos" },
  { key: "sent", label: "Enviadas" },
  { key: "accepted", label: "Aceitas" },
  { key: "rejected", label: "Rejeitadas" },
  { key: "expired", label: "Expiradas" },
] as const;

export default async function PropostasPage({ searchParams }: PageProps<"/admin/crm/propostas">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status)?.key ?? "all";
  const rows = await listProposals(ctx, filter === "all" ? {} : { status: filter as Exclude<typeof filter, "all"> });

  return (
    <>
      <PageHeader title="Propostas" meta="Propostas comerciais das oportunidades do CRM." />

      <nav className="flex gap-1 border-b border-border" aria-label="Filtro">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/crm/propostas?status=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
              filter === f.key && "border-foreground text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState
            title="Nenhuma proposta encontrada."
            text="Propostas nascem no detalhe da oportunidade, como rascunho."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Número</th>
                <th className="h-10 px-4 font-medium">Título</th>
                <th className="h-10 px-4 font-medium">Empresa</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Enviada em</th>
                <th className="h-10 px-4 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="type-data px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/crm/propostas/${p.id}`} className="hover:text-link">
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/crm/empresas/${p.companyId}`} className="text-link hover:underline">
                      {p.companyName}
                    </Link>
                    <div className="type-micro text-muted-foreground">{p.opportunityTitle}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-sm border px-2 text-[0.75rem] font-medium",
                        STATUS_STYLE[p.status],
                      )}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {p.sentAt ? formatDate(p.sentAt) : <span className="text-faint">—</span>}
                  </td>
                  <td className="type-data px-4 py-3 text-right whitespace-nowrap">
                    {formatBrlCents(p.valueCents)}
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
