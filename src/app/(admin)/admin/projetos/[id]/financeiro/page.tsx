import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import {
  getProject,
  getProjectFinancials,
  listExpenses,
  listInvoices,
  listProjectProposals,
  listProjectRates,
  listTimeCostsByDeliverable,
} from "@/modules/projects/queries";
import { InvoiceFormDialog } from "@/modules/projects/components/invoice-form";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { cancelExpenseForm, cancelInvoiceForm, markExpensePaidForm, markInvoicePaidForm, setProjectRateForm } from "@/modules/projects/form-actions";
import { EXPENSE_KIND_LABEL, EXPENSE_STATE_LABEL, EXPENSE_STATE_STYLE, expenseState } from "@/modules/projects/payables";
import { INVOICE_STATE_LABEL, INVOICE_STATE_STYLE, invoiceState, summarizeInvoices } from "@/modules/projects/invoices";
import { formatHours } from "@/modules/projects/burndown";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpenseFormDialog } from "@/modules/projects/components/expense-form";
import { formatBrlCents, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Financeiro" };

const PROPOSAL_STATUS: Record<string, { label: string; klass: string }> = {
  draft: { label: "rascunho", klass: "bg-subtle text-muted-foreground" },
  sent: { label: "enviada", klass: "bg-link-soft text-link" },
  accepted: { label: "aceita", klass: "bg-success-soft text-success" },
  rejected: { label: "rejeitada", klass: "bg-danger-soft text-danger" },
  expired: { label: "expirada", klass: "bg-warning-soft text-warning" },
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default async function FinanceiroPage({ params }: PageProps<"/admin/projetos/[id]/financeiro">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const [financials, expenses, proposals, timeCosts, invoices, rates] = await Promise.all([
    getProjectFinancials(ctx, id),
    listExpenses(ctx, id),
    listProjectProposals(ctx, id),
    listTimeCostsByDeliverable(ctx, id),
    listInvoices(ctx, id),
    listProjectRates(ctx, id),
  ]);
  if (!financials) notFound();
  const today = todayInSaoPaulo();
  const billing = summarizeInvoices(invoices, today);
  const totalEstimate = timeCosts.reduce((s, r) => s + (r.estimateMinutes ?? 0), 0);

  const totalMinutes = timeCosts.reduce((s, r) => s + r.totalMinutes, 0);
  const totalLaborCents = timeCosts.reduce((s, r) => s + r.laborCents, 0);
  const totalWithoutRate = timeCosts.reduce((s, r) => s + r.entriesWithoutRate, 0);
  const totalExpenseCents = expenses.reduce((s, r) => s + (r.status === "cancelled" ? 0 : r.amountCents), 0);

  const budgetVsCostPct = financials.budgetCents && financials.budgetCents > 0
    ? Math.min(100, Math.round((financials.costCents / financials.budgetCents) * 100))
    : null;

  return (
    <>
      <PageHeader
        title={`Financeiro — ${project.project.title}`}
        meta="Orçamento vs. custo real (horas × rate + despesas) vs. receita aceita."
        actions={
          <ExpenseFormDialog
            projectId={id}
            trigger={<Button variant="secondary" size="sm" type="button">+ Nova despesa</Button>}
          />
        }
      />

      {financials.entriesWithoutRate > 0 && (
        <div className="rounded-md border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
          <strong>{financials.entriesWithoutRate} entrada{financials.entriesWithoutRate === 1 ? "" : "s"} sem rate.</strong>{" "}
          Elas contam <span className="type-data">R$ 0,00</span> pro custo. Ajuste seu rate em{" "}
          <Link href="/admin/conta" className="underline">/admin/conta → Rate por hora</Link>.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuotaCard label="Orçamento" value={formatBrlCents(financials.budgetCents)} hint="Snapshot da oportunidade" />
        <QuotaCard
          label="Custo"
          value={formatBrlCents(financials.costCents)}
          hint={`Labor ${formatBrlCents(financials.laborCents)} · despesas ${formatBrlCents(financials.expenseCents)}`}
          bar={budgetVsCostPct}
        />
        <QuotaCard
          label="Receita aceita"
          value={formatBrlCents(financials.revenueAcceptedCents)}
          hint={`${proposals.filter((p) => p.status === "accepted").length} aceita · ${proposals.filter((p) => p.status === "sent").length} enviada`}
        />
        <QuotaCard
          label="Margem"
          value={formatBrlCents(financials.marginCents)}
          hint={`${financials.marginPct}% sobre receita aceita`}
          tone={financials.marginCents >= 0 ? "positive" : "negative"}
        />
      </div>

      <Block
        title="Faturamento"
        aside={
          <span className="flex flex-wrap items-center gap-3">
            <span className="type-data text-xs text-faint">faturado {formatBrlCents(billing.invoicedCents)} · recebido {formatBrlCents(billing.paidCents)} · a receber {formatBrlCents(billing.receivableCents)}{billing.overdueCount ? ` · vencido ${formatBrlCents(billing.overdueCents)}` : ""}</span>
            <InvoiceFormDialog projectId={id} trigger={<Button variant="secondary" size="sm" type="button">+ Nova parcela</Button>} />
          </span>
        }
        padded={false}
      >
        {invoices.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma parcela. Cadastre as parcelas da proposta aceita para acompanhar vencimentos e recebimentos.</p>
        ) : (
          <div tabIndex={0} role="region" aria-label="Faturamento, role horizontalmente se necessário" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-muted-foreground">
              <tr className="text-left">
                <th className="h-10 px-4 font-medium">#</th>
                <th className="h-10 px-4 font-medium">Descrição</th>
                <th className="h-10 px-4 font-medium">Vencimento</th>
                <th className="h-10 px-4 text-right font-medium">Valor</th>
                <th className="h-10 px-4 font-medium">Situação</th>
                <th className="h-10 px-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const st = invoiceState(inv, today);
                return (
                  <tr key={inv.id} className="border-t border-border" data-testid={`parcela-${inv.number}`}>
                    <td className="type-data px-4 py-2">{inv.number}</td>
                    <td className="px-4 py-2">{inv.description}{inv.notes && <span className="type-micro block text-faint">{inv.notes}</span>}</td>
                    <td className="type-data px-4 py-2 whitespace-nowrap">{formatIsoDate(inv.dueAt)}{st === "paid" && inv.paidAt && <span className="type-micro block text-success">paga em {formatIsoDate(inv.paidAt)}</span>}</td>
                    <td className="type-data px-4 py-2 text-right">{formatBrlCents(inv.amountCents)}</td>
                    <td className="px-4 py-2"><span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium", INVOICE_STATE_STYLE[st])}>{INVOICE_STATE_LABEL[st]}</span></td>
                    <td className="px-4 py-2">
                      {inv.status === "pending" && (
                        <div className="flex flex-wrap gap-1.5">
                          <form action={markInvoicePaidForm} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={inv.id} />
                            <input type="hidden" name="projectId" value={id} />
                            <label className="sr-only" htmlFor={`paid-${inv.id}`}>Data do recebimento</label>
                            <input id={`paid-${inv.id}`} name="paidAt" type="date" defaultValue={today} className="h-8 rounded-sm border border-input bg-card px-2 text-xs" />
                            <Button type="submit" size="sm" variant="outline">Marcar paga</Button>
                          </form>
                          <InvoiceFormDialog projectId={id} invoice={{ id: inv.id, description: inv.description, amountCents: inv.amountCents, dueAt: inv.dueAt, notes: inv.notes }} trigger={<Button variant="ghost" size="sm" type="button">Editar</Button>} />
                          <ConfirmAction
                            trigger={<Button variant="ghost" size="sm">Cancelar</Button>}
                            title={`Cancelar a parcela ${inv.number}?`}
                            description="Ela sai do faturado e do a receber. O registro fica na tabela como cancelada."
                            confirmLabel="Cancelar parcela"
                            action={cancelInvoiceForm}
                            fields={{ id: inv.id, projectId: id }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Block>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Block
            title="Horas por entrega"
            aside={<span className="text-xs text-faint">{formatMinutes(totalMinutes)} · labor {formatBrlCents(totalLaborCents)}</span>}
            padded={false}
          >
            {timeCosts.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma entrada fechada ainda.</p>
            ) : (
              <div tabIndex={0} role="region" aria-label="Horas por entrega, role horizontalmente se necessário" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-muted-foreground">
                  <tr className="text-left">
                    <th className="h-10 px-4 font-medium">Entrega</th>
                    <th className="h-10 px-4 text-right font-medium">Estimado</th>
                    <th className="h-10 px-4 text-right font-medium">Apontado</th>
                    <th className="h-10 px-4 text-right font-medium">Custo</th>
                    <th className="h-10 px-4 text-right font-medium">Sem rate</th>
                  </tr>
                </thead>
                <tbody>
                  {timeCosts.map((r) => (
                    <tr key={r.deliverableId} className="border-t border-border">
                      <td className="px-4 py-2">
                        <Link href={`/admin/projetos/${id}/entregas/${r.deliverableId}`} className="hover:text-link">
                          {r.title}
                        </Link>
                      </td>
                      <td className="type-data px-4 py-2 text-right text-muted-foreground">{r.estimateMinutes != null ? formatHours(r.estimateMinutes) : "—"}</td>
                      <td className={cn("type-data px-4 py-2 text-right", r.estimateMinutes != null && r.totalMinutes > r.estimateMinutes && "text-danger")}>{formatHours(r.totalMinutes)}</td>
                      <td className="type-data px-4 py-2 text-right">{formatBrlCents(r.laborCents)}</td>
                      <td className="type-data px-4 py-2 text-right">{r.entriesWithoutRate}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-subtle text-sm font-medium">
                    <td className="px-4 py-2">Total</td>
                    <td className="type-data px-4 py-2 text-right text-muted-foreground">{totalEstimate ? formatHours(totalEstimate) : "—"}</td>
                    <td className="type-data px-4 py-2 text-right">{formatHours(totalMinutes)}</td>
                    <td className="type-data px-4 py-2 text-right">{formatBrlCents(totalLaborCents)}</td>
                    <td className="type-data px-4 py-2 text-right">{totalWithoutRate}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            )}
          </Block>

          <Block
            title="Despesas"
            aside={
              <ExpenseFormDialog
                projectId={id}
                trigger={<Button variant="secondary" size="sm" type="button">+ Nova despesa</Button>}
              />
            }
            padded={false}
          >
            {expenses.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma despesa ainda.</p>
            ) : (
              <div tabIndex={0} role="region" aria-label="Despesas, role horizontalmente se necessário" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-muted-foreground">
                  <tr className="text-left">
                    <th className="h-10 px-4 font-medium">Descrição</th>
                    <th className="h-10 px-4 font-medium">Tipo</th>
                    <th className="h-10 px-4 font-medium">Vencimento</th>
                    <th className="h-10 px-4 text-right font-medium">Valor</th>
                    <th className="h-10 px-4 font-medium">Situação</th>
                    <th className="h-10 px-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => {
                    const st = expenseState(e, today);
                    return (
                      <tr key={e.id} className="border-t border-border">
                        <td className="px-4 py-2">
                          <div className="font-medium">{e.description}</div>
                          {(e.supplier || e.notes) && <div className="type-micro text-faint">{[e.supplier, e.notes].filter(Boolean).join(" · ")}</div>}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center rounded-sm border border-border bg-subtle px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap text-muted-foreground">
                            {EXPENSE_KIND_LABEL[e.kind]}
                          </span>
                        </td>
                        <td className="type-data px-4 py-2 whitespace-nowrap text-muted-foreground">
                          {formatIsoDate(e.dueAt)}
                          {st === "paid" && e.paidAt && <span className="type-micro block text-success">paga em {formatIsoDate(e.paidAt)}</span>}
                        </td>
                        <td className="type-data px-4 py-2 text-right">{formatBrlCents(e.amountCents)}</td>
                        <td className="px-4 py-2"><span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium", EXPENSE_STATE_STYLE[st])}>{EXPENSE_STATE_LABEL[st]}</span></td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {e.status === "pending" && (
                              <form action={markExpensePaidForm} className="flex items-center gap-1">
                                <input type="hidden" name="id" value={e.id} />
                                <input type="hidden" name="projectId" value={id} />
                                <label className="sr-only" htmlFor={`epaid-${e.id}`}>Data do pagamento</label>
                                <input id={`epaid-${e.id}`} name="paidAt" type="date" defaultValue={today} className="h-8 rounded-sm border border-input bg-card px-2 text-xs" />
                                <Button type="submit" size="sm" variant="outline">Marcar paga</Button>
                              </form>
                            )}
                            <ExpenseFormDialog
                              projectId={id}
                              expense={{ id: e.id, projectId: id, supplier: e.supplier, description: e.description, amountCents: e.amountCents, kind: e.kind, dueAt: e.dueAt, dateAt: e.dateAt, notes: e.notes }}
                              trigger={<Button variant="ghost" size="sm" type="button">Editar</Button>}
                            />
                            {e.status === "pending" && (
                              <ConfirmAction
                                trigger={<Button variant="ghost" size="sm">Cancelar</Button>}
                                title={`Cancelar "${e.description}"?`}
                                description="Ela sai do custo e do a pagar. O registro fica na tabela como cancelada."
                                confirmLabel="Cancelar conta"
                                action={cancelExpenseForm}
                                fields={{ id: e.id, projectId: id }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-subtle text-sm font-medium">
                    <td className="px-4 py-2" colSpan={3}>Total (sem canceladas)</td>
                    <td className="type-data px-4 py-2 text-right">{formatBrlCents(totalExpenseCents)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
              </div>
            )}
          </Block>

          <Block title="Rate por hora neste projeto" aside={<span className="text-xs text-faint">vazio = rate da pessoa</span>} padded={false}>
            <ul className="divide-y divide-border">
              {rates.map((r) => (
                <li key={r.userId} className="px-5 py-3 text-sm">
                  <form action={setProjectRateForm} className="flex flex-wrap items-center justify-between gap-2">
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="userId" value={r.userId} />
                    <span className="min-w-0">
                      <span className="block font-medium">{r.name}</span>
                      <span className="type-micro text-faint">rate da pessoa: {r.personalRateCents != null ? `${formatBrlCents(r.personalRateCents)}/h` : "não definido"}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <label className="sr-only" htmlFor={`rate-${r.userId}`}>Rate de {r.name} neste projeto, em centavos</label>
                      <Input id={`rate-${r.userId}`} name="hourlyRateCents" inputMode="numeric" placeholder="cents/h" defaultValue={r.projectRateCents ?? ""} className="h-8 w-28 text-right" />
                      <Button type="submit" size="sm" variant="outline">Salvar</Button>
                    </span>
                  </form>
                </li>
              ))}
            </ul>
            <p className="type-micro px-5 py-3 text-muted-foreground">Vale para as entradas fechadas daqui em diante: o custo das horas antigas não muda (rate congelado em cada entrada).</p>
          </Block>

          <Block title="Propostas" aside={<span className="text-xs text-faint">Da oportunidade origem</span>} padded={false}>
            {proposals.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma proposta vinculada.</p>
            ) : (
              <div tabIndex={0} role="region" aria-label="Propostas, role horizontalmente se necessário" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-muted-foreground">
                  <tr className="text-left">
                    <th className="h-10 px-4 font-medium">Número</th>
                    <th className="h-10 px-4 font-medium">Título</th>
                    <th className="h-10 px-4 font-medium">Status</th>
                    <th className="h-10 px-4 font-medium">Enviada</th>
                    <th className="h-10 px-4 font-medium">Decidida</th>
                    <th className="h-10 px-4 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => {
                    const s = PROPOSAL_STATUS[p.status] ?? { label: p.status, klass: "bg-subtle text-muted-foreground" };
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="type-data px-4 py-2">{p.number}</td>
                        <td className="px-4 py-2">{p.title}</td>
                        <td className="px-4 py-2">
                          <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[0.7rem]", s.klass)}>
                            {s.label}
                          </span>
                        </td>
                        <td className="type-data px-4 py-2 text-muted-foreground">{formatIsoDate(p.sentAt)}</td>
                        <td className="type-data px-4 py-2 text-muted-foreground">{formatIsoDate(p.decidedAt)}</td>
                        <td className="type-data px-4 py-2 text-right">{formatBrlCents(p.valueCents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </Block>
        </div>

        <div className="flex flex-col gap-6">
          <Block title="Fórmulas">
            <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
              <p><strong className="font-medium text-foreground">labor</strong> = <code className="type-data">Σ floor(minutes × rate ÷ 60)</code></p>
              <p><strong className="font-medium text-foreground">cost</strong> = <code className="type-data">labor + expenses</code></p>
              <p><strong className="font-medium text-foreground">revenueAccepted</strong> = <code className="type-data">Σ propostas aceitas</code></p>
              <p><strong className="font-medium text-foreground">margin</strong> = <code className="type-data">revenueAccepted − cost</code></p>
              <p><strong className="font-medium text-foreground">marginPct</strong> = <code className="type-data">round(margin ÷ revenueAccepted × 100)</code></p>
            </div>
          </Block>
        </div>
      </div>
    </>
  );
}

function QuotaCard({
  label,
  value,
  hint,
  bar,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  bar?: number | null;
  tone?: "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card p-4",
        tone === "positive" && "border-success",
        tone === "negative" && "border-danger",
      )}
    >
      <span className="type-micro text-muted-foreground">{label}</span>
      <span
        className={cn(
          "type-data text-2xl font-semibold",
          tone === "positive" && "text-success",
          tone === "negative" && "text-danger",
        )}
      >
        {value}
      </span>
      {hint && <span className="type-micro text-muted-foreground">{hint}</span>}
      {bar != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-subtle">
          <div className="h-full bg-link" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
