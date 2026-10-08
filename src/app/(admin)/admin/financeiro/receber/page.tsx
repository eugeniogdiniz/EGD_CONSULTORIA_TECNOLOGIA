import Link from "next/link";
import { requireOwner } from "@/modules/auth/context";
import { listAllInvoices, listProjectOptions } from "@/modules/projects/queries";
import { INVOICE_STATE_LABEL, INVOICE_STATE_STYLE, invoiceState, summarizeInvoices } from "@/modules/projects/invoices";
import { paidInPeriod } from "@/modules/projects/payables";
import { cancelInvoiceForm, markInvoicePaidForm } from "@/modules/projects/form-actions";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { Button } from "@/components/ui/button";
import { formatBrlCents, formatIsoDate } from "@/lib/format";
import { LedgerFilterForm, LedgerFoot, LedgerKpi, StateBadge, parseLedgerParams } from "../_components/ledger";

export const metadata = { title: "Contas a receber" };

export default async function ContasAReceberPage({ searchParams }: PageProps<"/admin/financeiro/receber">) {
  const ctx = await requireOwner();
  const today = todayInSaoPaulo();
  const filters = parseLedgerParams(await searchParams, today);
  const [rows, all, projects] = await Promise.all([
    listAllInvoices(ctx, filters),
    listAllInvoices(ctx, { state: "all", from: null, to: null, projectId: null, today }),
    listProjectOptions(ctx),
  ]);
  const totals = summarizeInvoices(all, today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const receivedThisMonth = paidInPeriod(all, monthStart, today);
  const listedCents = rows.reduce((s, r) => s + (r.status === "cancelled" ? 0 : r.amountCents), 0);

  return (
    <>
      <PageHeader title="Contas a receber" meta="Parcelas de todos os projetos. A parcela nasce no financeiro do projeto, a partir da proposta aceita." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LedgerKpi label="A receber" value={formatBrlCents(totals.receivableCents)} hint="pendentes, vencidas inclusas" href="/admin/financeiro/receber?situacao=open" />
        <LedgerKpi label="Vencidas" value={formatBrlCents(totals.overdueCents)} hint={`${totals.overdueCount} parcela${totals.overdueCount === 1 ? "" : "s"}`} tone={totals.overdueCount ? "danger" : undefined} href="/admin/financeiro/receber?situacao=overdue" />
        <LedgerKpi label="Vencem em 7 dias" value={String(totals.dueSoonCount)} hint="parcelas pendentes" tone={totals.dueSoonCount ? "warning" : undefined} />
        <LedgerKpi label="Recebido no mês" value={formatBrlCents(receivedThisMonth)} hint={`desde ${formatIsoDate(monthStart)}`} tone="success" href="/admin/financeiro/receber?situacao=paid" />
      </div>

      <LedgerFilterForm action="/admin/financeiro/receber" filters={filters} projects={projects} />

      <Block title="Parcelas" aside={`${rows.length} listada${rows.length === 1 ? "" : "s"} · ${formatBrlCents(listedCents)}`} padded={false}>
        {rows.length === 0 ? (
          <EmptyState title="Nenhuma parcela com esses filtros." text="As parcelas são cadastradas no financeiro de cada projeto (Projetos → projeto → Financeiro → Nova parcela)." />
        ) : (
          <div tabIndex={0} role="region" aria-label="Parcelas, role horizontalmente se necessário" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle text-muted-foreground">
                <tr className="text-left">
                  <th className="h-10 px-4 font-medium">Vencimento</th>
                  <th className="h-10 px-4 font-medium">Projeto</th>
                  <th className="h-10 px-4 font-medium">Parcela</th>
                  <th className="h-10 px-4 text-right font-medium">Valor</th>
                  <th className="h-10 px-4 font-medium">Situação</th>
                  <th className="h-10 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const st = invoiceState(inv, today);
                  return (
                    <tr key={inv.id} className="border-t border-border" data-testid={`receber-${inv.id}`}>
                      <td className="type-data px-4 py-2 whitespace-nowrap">
                        {formatIsoDate(inv.dueAt)}
                        {st === "paid" && inv.paidAt && <span className="type-micro block text-success">recebida em {formatIsoDate(inv.paidAt)}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/admin/projetos/${inv.projectId}/financeiro`} className="font-medium hover:text-link">{inv.projectTitle}</Link>
                        <span className="type-micro block text-faint">{inv.companyName}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="type-data text-faint">#{inv.number}</span> {inv.description}
                        {inv.notes && <span className="type-micro block text-faint">{inv.notes}</span>}
                      </td>
                      <td className="type-data px-4 py-2 text-right">{formatBrlCents(inv.amountCents)}</td>
                      <td className="px-4 py-2"><StateBadge label={INVOICE_STATE_LABEL[st]} klass={INVOICE_STATE_STYLE[st]} /></td>
                      <td className="px-4 py-2">
                        {inv.status === "pending" && (
                          <div className="flex flex-wrap gap-1.5">
                            <form action={markInvoicePaidForm} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={inv.id} />
                              <input type="hidden" name="projectId" value={inv.projectId} />
                              <label className="sr-only" htmlFor={`paid-${inv.id}`}>Data do recebimento</label>
                              <input id={`paid-${inv.id}`} name="paidAt" type="date" defaultValue={today} className="h-8 rounded-sm border border-input bg-card px-2 text-xs" />
                              <Button type="submit" size="sm" variant="outline">Marcar recebida</Button>
                            </form>
                            <ConfirmAction
                              trigger={<Button variant="ghost" size="sm">Cancelar</Button>}
                              title={`Cancelar a parcela ${inv.number} de ${inv.projectTitle}?`}
                              description="Ela sai do faturado e do a receber. O registro fica na tabela como cancelada."
                              confirmLabel="Cancelar parcela"
                              action={cancelInvoiceForm}
                              fields={{ id: inv.id, projectId: inv.projectId }}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <LedgerFoot label="Total listado (sem canceladas)" cents={formatBrlCents(listedCents)} span={3} />
            </table>
          </div>
        )}
      </Block>
    </>
  );
}
