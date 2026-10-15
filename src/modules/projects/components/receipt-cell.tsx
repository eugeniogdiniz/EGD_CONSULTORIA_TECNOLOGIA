import { cn } from "cn";
import { formatBrlCents, formatIsoDate } from "@/lib/format";
import { receiptDifference, receivedOf } from "@/modules/projects/invoices";

/** Valor da parcela e, se recebida, quanto entrou, quando e a diferença. */
export function InvoiceAmountCell({ inv }: { inv: { amountCents: number; receivedCents: number | null; status: "pending" | "paid" | "cancelled"; paidAt: string | null } }) {
  const diff = receiptDifference(inv);
  return (
    <>
      <span className="type-data">{formatBrlCents(inv.amountCents)}</span>
      {inv.status === "paid" && (
        <span className="type-micro block text-success">
          recebido {formatBrlCents(receivedOf(inv))}
          {inv.paidAt ? ` em ${formatIsoDate(inv.paidAt)}` : ""}
        </span>
      )}
      {diff !== 0 && (
        <span className={cn("type-micro block", diff < 0 ? "text-danger" : "text-muted-foreground")}>
          {diff < 0 ? `${formatBrlCents(-diff)} a menos` : `${formatBrlCents(diff)} a mais`}
        </span>
      )}
    </>
  );
}
