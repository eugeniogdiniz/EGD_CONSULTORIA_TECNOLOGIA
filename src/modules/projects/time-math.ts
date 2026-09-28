/**
 * Minutos entre dois instantes, arredondados para cima (uma janela de 5m 30s
 * conta como 6 minutos). Usado tanto pelo stop do timer quanto pela entrada
 * manual pra manter o número gravado consistente entre origens.
 */
export function computeMinutes(startedAt: Date, endedAt: Date): number {
  const ms = endedAt.getTime() - startedAt.getTime();
  if (ms < 0) throw new Error("endedAt anterior a startedAt");
  if (ms === 0) return 0;
  return Math.ceil(ms / 60_000);
}

export type FinancialsEntry = {
  minutes: number | null;
  hourlyRateCents: number | null;
};

export type FinancialsExpense = { amountCents: number };

export type FinancialsProposal = {
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  valueCents: number;
};

export type FinancialsInput = {
  budgetCents: number | null;
  entries: readonly FinancialsEntry[];
  expenses: readonly FinancialsExpense[];
  proposals: readonly FinancialsProposal[];
};

export type FinancialsOutput = {
  budgetCents: number | null;
  laborCents: number;
  expenseCents: number;
  costCents: number;
  revenueSentCents: number;
  revenueAcceptedCents: number;
  marginCents: number;
  marginPct: number;
  entriesWithoutRate: number;
};

/**
 * Puro. Devolve o quadro financeiro do projeto:
 * - `laborCents`: soma de `floor(minutes * rate / 60)` das entradas fechadas
 *   com rate presente. Entradas abertas (`minutes === null`) e sem rate
 *   contam 0.
 * - `entriesWithoutRate`: quantas entradas fechadas ficaram fora do labor
 *   por falta de rate (a UI usa pra alertar).
 * - `revenueSent`/`revenueAccepted`: soma das propostas nesses status.
 * - `marginCents = revenueAccepted − cost` (pode ser negativo).
 * - `marginPct = round(margin / revenueAccepted * 100)` (0 quando receita 0).
 */
export function computeFinancials(input: FinancialsInput): FinancialsOutput {
  let laborCents = 0;
  let entriesWithoutRate = 0;
  for (const entry of input.entries) {
    if (entry.minutes === null) continue;
    if (entry.hourlyRateCents === null) {
      entriesWithoutRate += 1;
      continue;
    }
    laborCents += Math.floor((entry.minutes * entry.hourlyRateCents) / 60);
  }

  const expenseCents = input.expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const costCents = laborCents + expenseCents;

  let revenueSentCents = 0;
  let revenueAcceptedCents = 0;
  for (const p of input.proposals) {
    if (p.status === "sent") revenueSentCents += p.valueCents;
    else if (p.status === "accepted") revenueAcceptedCents += p.valueCents;
  }

  const marginCents = revenueAcceptedCents - costCents;
  const marginPct =
    revenueAcceptedCents === 0
      ? 0
      : Math.round((marginCents / revenueAcceptedCents) * 100);

  return {
    budgetCents: input.budgetCents,
    laborCents,
    expenseCents,
    costCents,
    revenueSentCents,
    revenueAcceptedCents,
    marginCents,
    marginPct,
    entriesWithoutRate,
  };
}
