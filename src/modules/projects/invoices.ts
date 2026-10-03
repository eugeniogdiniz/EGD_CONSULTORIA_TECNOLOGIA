/** Parcelas do projeto: estado derivado e totais. Puro: `today` em 'YYYY-MM-DD'. */
export type InvoiceLike = { amountCents: number; dueAt: string; status: "pending" | "paid" | "cancelled"; paidAt?: string | null };
export type InvoiceState = "pending" | "overdue" | "paid" | "cancelled";

export function invoiceState(inv: Pick<InvoiceLike, "status" | "dueAt">, today: string): InvoiceState {
  if (inv.status === "paid" || inv.status === "cancelled") return inv.status;
  return inv.dueAt < today ? "overdue" : "pending";
}

export const INVOICE_STATE_LABEL: Record<InvoiceState, string> = { pending: "Pendente", overdue: "Vencida", paid: "Paga", cancelled: "Cancelada" };
export const INVOICE_STATE_STYLE: Record<InvoiceState, string> = {
  pending: "border-link bg-link-soft text-link",
  overdue: "border-danger bg-danger-soft text-danger",
  paid: "border-success bg-success-soft text-success",
  cancelled: "border-border bg-subtle text-muted-foreground",
};

export type InvoiceSummary = { invoicedCents: number; paidCents: number; receivableCents: number; overdueCents: number; overdueCount: number; dueSoonCount: number };

/** Faturado = tudo menos canceladas; a receber = pendentes (vencidas inclusas); vencendo = pendentes nos próximos 7 dias. */
export function summarizeInvoices(list: InvoiceLike[], today: string, horizonDays = 7): InvoiceSummary {
  const horizon = addDaysIso(today, horizonDays);
  const out: InvoiceSummary = { invoicedCents: 0, paidCents: 0, receivableCents: 0, overdueCents: 0, overdueCount: 0, dueSoonCount: 0 };
  for (const inv of list) {
    const st = invoiceState(inv, today);
    if (st === "cancelled") continue;
    out.invoicedCents += inv.amountCents;
    if (st === "paid") out.paidCents += inv.amountCents;
    else {
      out.receivableCents += inv.amountCents;
      if (st === "overdue") {
        out.overdueCents += inv.amountCents;
        out.overdueCount += 1;
      } else if (inv.dueAt <= horizon) out.dueSoonCount += 1;
    }
  }
  return out;
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
