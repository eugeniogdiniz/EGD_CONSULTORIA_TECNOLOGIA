/** Parcelas do projeto: estado derivado e totais. Puro: `today` em 'YYYY-MM-DD'. */
export type InvoiceLike = { amountCents: number; dueAt: string; status: "pending" | "paid" | "cancelled"; paidAt?: string | null; receivedCents?: number | null };

/** Quanto de fato entrou por uma parcela paga; sem registro (dado antigo), vale o valor da parcela. */
export function receivedOf(inv: Pick<InvoiceLike, "amountCents" | "receivedCents">): number {
  return inv.receivedCents ?? inv.amountCents;
}

/** Diferença entre o recebido e o valor da parcela (negativo = entrou menos). Zero se pendente ou cancelada. */
export function receiptDifference(inv: Pick<InvoiceLike, "amountCents" | "receivedCents" | "status">): number {
  return inv.status === "paid" ? receivedOf(inv) - inv.amountCents : 0;
}

/** Recebido dentro de [from, to] (datas ISO, inclusivas) pela data e pelo valor efetivos do recebimento. */
export function receivedInPeriod(list: InvoiceLike[], from: string | null, to: string | null): number {
  return list.reduce((sum, inv) => {
    if (inv.status !== "paid" || !inv.paidAt) return sum;
    if (from && inv.paidAt < from) return sum;
    if (to && inv.paidAt > to) return sum;
    return sum + receivedOf(inv);
  }, 0);
}
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
    // faturado segue o valor da parcela; recebido segue o que de fato entrou
    if (st === "paid") out.paidCents += receivedOf(inv);
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
