/**
 * Contas a pagar: a despesa (`project_expense`) tem o mesmo ciclo da parcela
 * (pendente → paga | cancelada, vencida derivada), então reaproveita a
 * matemática de `invoices.ts`. Puro: `today` em 'YYYY-MM-DD'.
 */
import { invoiceState, summarizeInvoices, type InvoiceLike, type InvoiceState, type InvoiceSummary } from "./invoices";

export type ExpenseLike = InvoiceLike;
export type ExpenseState = InvoiceState;
export type ExpenseKind = "travel" | "service" | "equipment" | "software" | "tax" | "payroll" | "other";

export const expenseState = invoiceState;

export const EXPENSE_STATE_LABEL: Record<ExpenseState, string> = { pending: "Pendente", overdue: "Vencida", paid: "Paga", cancelled: "Cancelada" };
export const EXPENSE_STATE_STYLE: Record<ExpenseState, string> = {
  pending: "border-link bg-link-soft text-link",
  overdue: "border-danger bg-danger-soft text-danger",
  paid: "border-success bg-success-soft text-success",
  cancelled: "border-border bg-subtle text-muted-foreground",
};

export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = {
  travel: "Viagem",
  service: "Serviço",
  equipment: "Equipamento",
  software: "Software",
  tax: "Imposto",
  payroll: "Pró-labore / folha",
  other: "Outros",
};

export const EXPENSE_KIND_OPTIONS = (Object.keys(EXPENSE_KIND_LABEL) as ExpenseKind[]).map((value) => ({ value, label: EXPENSE_KIND_LABEL[value] }));

export type PayableSummary = { totalCents: number; paidCents: number; payableCents: number; overdueCents: number; overdueCount: number; dueSoonCount: number };

/** Total = tudo menos canceladas; a pagar = pendentes (vencidas inclusas); vencendo = pendentes nos próximos 7 dias. */
export function summarizeExpenses(list: ExpenseLike[], today: string, horizonDays = 7): PayableSummary {
  const s: InvoiceSummary = summarizeInvoices(list, today, horizonDays);
  return { totalCents: s.invoicedCents, paidCents: s.paidCents, payableCents: s.receivableCents, overdueCents: s.overdueCents, overdueCount: s.overdueCount, dueSoonCount: s.dueSoonCount };
}

/** Pago dentro de um período [from, to] (datas ISO, inclusivas); sem período, tudo que está pago. */
export function paidInPeriod(list: (ExpenseLike & { paidAt?: string | null })[], from: string | null, to: string | null): number {
  return list.reduce((sum, e) => {
    if (e.status !== "paid" || !e.paidAt) return sum;
    if (from && e.paidAt < from) return sum;
    if (to && e.paidAt > to) return sum;
    return sum + e.amountCents;
  }, 0);
}
