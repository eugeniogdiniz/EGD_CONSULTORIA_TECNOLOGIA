import Link from "next/link";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { CONTRACT_STATUS_LABEL, listContracts } from "@/modules/contracts/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { formatBrlCents, formatDate } from "@/lib/format";

export const metadata = { title: "Contratos" };

export const CONTRACT_STATUS_STYLE: Record<string, string> = {
  draft: "border-border bg-subtle text-muted-foreground",
  issued: "border-signal-strong bg-signal-soft text-signal-strong",
  signed: "border-success bg-success-soft text-success",
};

export default async function ContratosPage() {
  const ctx = await requireOwner();
  const rows = await listContracts(ctx);
  return (
    <>
      <PageHeader title="Contratos" meta="Contratos de prestação de serviços gerados a partir das propostas aceitas." />
      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState title="Nenhum contrato ainda." text="O contrato nasce na página da proposta aceita, com o botão Criar contrato." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Número</th>
                <th className="h-10 px-4 font-medium">Projeto</th>
                <th className="h-10 px-4 font-medium">Empresa</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Emitido em</th>
                <th className="h-10 px-4 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="type-data px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/crm/contratos/${c.id}`} className="hover:text-link">{c.number}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {c.title}
                    <div className="type-micro text-muted-foreground">proposta {c.proposalNumber}{c.documentVersion > 0 ? ` · PDF v${c.documentVersion}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/crm/empresas/${c.companyId}`} className="text-link hover:underline">{c.companyName}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex h-6 items-center rounded-sm border px-2 text-[0.75rem] font-medium", CONTRACT_STATUS_STYLE[c.status])}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {c.signedAt ? `assinado ${formatDate(c.signedAt)}` : c.issuedAt ? formatDate(c.issuedAt) : <span className="text-faint">—</span>}
                  </td>
                  <td className="type-data px-4 py-3 text-right whitespace-nowrap">{formatBrlCents(c.valueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
