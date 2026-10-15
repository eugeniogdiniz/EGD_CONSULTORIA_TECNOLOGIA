import { describe, it, expect } from "vitest";
import { invoiceState, receiptDifference, receivedInPeriod, receivedOf, summarizeInvoices } from "@/modules/projects/invoices";

const today = "2026-10-03";
describe("parcelas", () => {
  it("estado derivado: vencida só quando pendente e antes de hoje", () => {
    expect(invoiceState({ status: "pending", dueAt: "2026-10-03" }, today)).toBe("pending");
    expect(invoiceState({ status: "pending", dueAt: "2026-10-02" }, today)).toBe("overdue");
    expect(invoiceState({ status: "paid", dueAt: "2026-09-01" }, today)).toBe("paid");
    expect(invoiceState({ status: "cancelled", dueAt: "2026-09-01" }, today)).toBe("cancelled");
  });
  it("totais: faturado exclui canceladas; a receber inclui vencidas; vencendo em 7 dias", () => {
    const s = summarizeInvoices(
      [
        { amountCents: 1000, dueAt: "2026-09-01", status: "paid" },
        { amountCents: 2000, dueAt: "2026-09-30", status: "pending" },
        { amountCents: 3000, dueAt: "2026-10-08", status: "pending" },
        { amountCents: 4000, dueAt: "2026-11-01", status: "pending" },
        { amountCents: 9999, dueAt: "2026-10-01", status: "cancelled" },
      ],
      today,
    );
    expect(s).toEqual({ invoicedCents: 10000, paidCents: 1000, receivableCents: 9000, overdueCents: 2000, overdueCount: 1, dueSoonCount: 1 });
  });
  it("recebido usa o valor real; sem registro antigo, o da parcela", () => {
    expect(receivedOf({ amountCents: 1000, receivedCents: 950 })).toBe(950);
    expect(receivedOf({ amountCents: 1000, receivedCents: null })).toBe(1000);
    expect(receiptDifference({ amountCents: 1000, receivedCents: 950, status: "paid" })).toBe(-50);
    expect(receiptDifference({ amountCents: 1000, receivedCents: null, status: "pending" })).toBe(0);
    const list = [
      { amountCents: 1000, receivedCents: 950, dueAt: "2026-10-01", status: "paid" as const, paidAt: "2026-10-02" },
      { amountCents: 2000, receivedCents: null, dueAt: "2026-09-01", status: "paid" as const, paidAt: "2026-09-05" },
      { amountCents: 5000, dueAt: "2026-10-01", status: "pending" as const },
    ];
    expect(summarizeInvoices(list, today)).toMatchObject({ invoicedCents: 8000, paidCents: 2950, receivableCents: 5000 });
    expect(receivedInPeriod(list, "2026-10-01", "2026-10-31")).toBe(950);
    expect(receivedInPeriod(list, null, null)).toBe(2950);
  });
});
