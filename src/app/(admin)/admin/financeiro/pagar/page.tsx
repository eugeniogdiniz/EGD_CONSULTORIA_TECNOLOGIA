import Link from "next/link";
import { requireOwner } from "@/modules/auth/context";
import { listAllExpenses, listProjectOptions } from "@/modules/projects/queries";
import { EXPENSE_KIND_LABEL, EXPENSE_STATE_LABEL, EXPENSE_STATE_STYLE, expenseState, paidInPeriod, summarizeExpenses } from "@/modules/projects/payables";
import { cancelExpenseForm, markExpensePaidForm } from "@/modules/projects/form-actions";
import { ExpenseFormDialog } from "@/modules/projects/components/expense-form";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { Button } from "@/components/ui/button";
import { formatBrlCents, formatIsoDate } from "@/lib/format";
import { LedgerFilterForm, LedgerFoot, LedgerKpi, StateBadge, parseLedgerParams } from "../_components/ledger";

export const metadata = { title: "Contas a pagar" };

export default async function ContasAPagarPage({ searchParams }: PageProps<"/admin/financeiro/pagar">) {
  const ctx = await requireOwner();
  const today = todayInSaoPaulo();
  const filters = parseLedgerParams(await searchParams, today);
  const [rows, all, projects] = await Promise.all([
    listAllExpenses(ctx, filters),
    listAllExpenses(ctx, { state: "all", from: null, to: null, projectId: null, today }),
    listProjectOptions(ctx),
  ]);
  const totals = summarizeExpenses(all, today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const paidThisMonth = paidInPeriod(all, monthStart, today);
  const listedCents = rows.reduce((s, r) => s + (r.status === "cancelled" ? 0 : r.amountCents), 0);
  const projectOptions = projects.map((p) => ({ id: p.id, title: p.title, companyName: p.companyName }));

  return (
    <>
      <PageHeader
        title="Contas a pagar"
        meta="Despesas dos projetos e custos gerais da EGD (ferramentas, impostos, pró-labore). O que tem projeto entra no custo dele."
        actions={<ExpenseFormDialog projects={projectOptions} trigger={<Button size="sm" type="button">+ Nova conta a pagar</Button>} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LedgerKpi label="A pagar" value={formatBrlCents(totals.payableCents)} hint="pendentes, vencidas inclusas" href="/admin/financeiro/pagar?situacao=open" />
        <LedgerKpi label="Vencidas" value={formatBrlCents(totals.overdueCents)} hint={`${totals.overdueCount} conta${totals.overdueCount === 1 ? "" : "s"}`} tone={totals.overdueCount ? "danger" : undefined} href="/admin/financeiro/pagar?situacao=overdue" />
        <LedgerKpi label="Vencem em 7 dias" value={String(totals.dueSoonCount)} hint="contas pendentes" tone={totals.dueSoonCount ? "warning" : undefined} />
        <LedgerKpi label="Pago no mês" value={formatBrlCents(paidThisMonth)} hint={`desde ${formatIsoDate(monthStart)}`} href="/admin/financeiro/pagar?situacao=paid" />
      </div>

      <LedgerFilterForm action="/admin/financeiro/pagar" filters={filters} projects={projects} generalOption />

      <Block title="Contas" aside={`${rows.length} listada${rows.length === 1 ? "" : "s"} · ${formatBrlCents(listedCents)}`} padded={false}>
        {rows.length === 0 ? (
          <EmptyState title="Nenhuma conta com esses filtros." text="Cadastre uma conta a pagar aqui ou uma despesa no financeiro do projeto. Vencimento, fornecedor e situação entram no fluxo de caixa." />
        ) : (
          <div tabIndex={0} role="region" aria-label="Contas, role horizontalmente se necessário" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle text-muted-foreground">
                <tr className="text-left">
                  <th className="h-10 px-4 font-medium">Vencimento</th>
                  <th className="h-10 px-4 font-medium">Descrição</th>
                  <th className="h-10 px-4 font-medium">Projeto</th>
                  <th className="h-10 px-4 font-medium">Tipo</th>
                  <th className="h-10 px-4 text-right font-medium">Valor</th>
                  <th className="h-10 px-4 font-medium">Situação</th>
                  <th className="h-10 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const st = expenseState(e, today);
                  return (
                    <tr key={e.id} className="border-t border-border" data-testid={`pagar-${e.id}`}>
                      <td className="type-data px-4 py-2 whitespace-nowrap">
                        {formatIsoDate(e.dueAt)}
                        {st === "paid" && e.paidAt && <span className="type-micro block text-success">paga em {formatIsoDate(e.paidAt)}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{e.description}</div>
                        {(e.supplier || e.notes) && <div className="type-micro text-faint">{[e.supplier, e.notes].filter(Boolean).join(" · ")}</div>}
                      </td>
                      <td className="px-4 py-2">
                        {e.projectId ? (
                          <>
                            <Link href={`/admin/projetos/${e.projectId}/financeiro`} className="hover:text-link">{e.projectTitle}</Link>
                            <span className="type-micro block text-faint">{e.companyName}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Custo geral</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-sm border border-border bg-subtle px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap text-muted-foreground">{EXPENSE_KIND_LABEL[e.kind]}</span>
                      </td>
                      <td className="type-data px-4 py-2 text-right">{formatBrlCents(e.amountCents)}</td>
                      <td className="px-4 py-2"><StateBadge label={EXPENSE_STATE_LABEL[st]} klass={EXPENSE_STATE_STYLE[st]} /></td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {e.status === "pending" && (
                            <form action={markExpensePaidForm} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="projectId" value={e.projectId ?? ""} />
                              <label className="sr-only" htmlFor={`paid-${e.id}`}>Data do pagamento</label>
                              <input id={`paid-${e.id}`} name="paidAt" type="date" defaultValue={today} className="h-8 rounded-sm border border-input bg-card px-2 text-xs" />
                              <Button type="submit" size="sm" variant="outline">Marcar paga</Button>
                            </form>
                          )}
                          <ExpenseFormDialog
                            projects={projectOptions}
                            expense={{ id: e.id, projectId: e.projectId, supplier: e.supplier, description: e.description, amountCents: e.amountCents, kind: e.kind, dueAt: e.dueAt, dateAt: e.dateAt, notes: e.notes }}
                            trigger={<Button variant="ghost" size="sm" type="button">Editar</Button>}
                          />
                          {e.status === "pending" && (
                            <ConfirmAction
                              trigger={<Button variant="ghost" size="sm">Cancelar</Button>}
                              title={`Cancelar "${e.description}"?`}
                              description="Ela sai do total e do a pagar. O registro fica na tabela como cancelada."
                              confirmLabel="Cancelar conta"
                              action={cancelExpenseForm}
                              fields={{ id: e.id, projectId: e.projectId ?? "" }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <LedgerFoot label="Total listado (sem canceladas)" cents={formatBrlCents(listedCents)} span={4} />
            </table>
          </div>
        )}
      </Block>
    </>
  );
}
