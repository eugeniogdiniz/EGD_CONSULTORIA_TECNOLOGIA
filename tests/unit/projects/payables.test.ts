import { describe, it, expect } from "vitest";
import { expenseState, paidInPeriod, summarizeExpenses } from "@/modules/projects/payables";

const today = "2026-10-08";
const list = [
  { amountCents: 10_000, dueAt: "2026-10-01", status: "pending" as const }, // vencida
  { amountCents: 5_000, dueAt: "2026-10-12", status: "pending" as const }, // vence em 4 dias
  { amountCents: 7_000, dueAt: "2026-11-30", status: "pending" as const }, // futura
  { amountCents: 3_000, dueAt: "2026-09-20", status: "paid" as const, paidAt: "2026-10-02" },
  { amountCents: 9_000, dueAt: "2026-09-25", status: "paid" as const, paidAt: "2026-09-26" },
  { amountCents: 99_000, dueAt: "2026-10-05", status: "cancelled" as const },
];

describe("contas a pagar", () => {
  it("estado derivado: pendente vencida vira 'overdue'; paga e cancelada ficam", () => {
    expect(expenseState(list[0], today)).toBe("overdue");
    expect(expenseState(list[1], today)).toBe("pending");
    expect(expenseState(list[3], today)).toBe("paid");
    expect(expenseState(list[5], today)).toBe("cancelled");
  });
  it("resumo: canceladas fora do total; a pagar = pendentes; vencidas e vencendo em 7 dias contadas", () => {
    const s = summarizeExpenses(list, today);
    expect(s.totalCents).toBe(34_000);
    expect(s.paidCents).toBe(12_000);
    expect(s.payableCents).toBe(22_000);
    expect(s.overdueCents).toBe(10_000);
    expect(s.overdueCount).toBe(1);
    expect(s.dueSoonCount).toBe(1);
  });
  it("pago no período olha a data do pagamento, não o vencimento", () => {
    expect(paidInPeriod(list, "2026-10-01", "2026-10-31")).toBe(3_000);
    expect(paidInPeriod(list, null, null)).toBe(12_000);
    expect(paidInPeriod(list, "2026-09-01", "2026-09-30")).toBe(9_000);
  });
});
