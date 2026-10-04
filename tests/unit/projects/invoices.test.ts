import { describe, it, expect } from "vitest";
import { invoiceState, summarizeInvoices } from "@/modules/projects/invoices";

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
});
