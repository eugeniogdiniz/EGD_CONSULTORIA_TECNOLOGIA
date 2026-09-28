import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";

/**
 * Formata número da proposta como PROP-YY-seq, com pelo menos três dígitos
 * na sequência. Sequências acima de 999 continuam formatadas sem cortar.
 */
export function formatProposalNumber(year: number, seq: number): string {
  const yy = ((year % 100) + 100) % 100;
  const yyStr = yy.toString().padStart(2, "0");
  const seqStr = seq.toString().padStart(3, "0");
  return `PROP-${yyStr}-${seqStr}`;
}

/**
 * Aceita `db` ou uma `tx` (ambas têm `.execute`). Sequências Postgres não
 * são transacionais — um rollback não devolve o número — então basta ter
 * uma interface que rode SQL.
 */
type SqlRunner = Pick<Db, "execute">;

/**
 * Gera o próximo número usando a função Postgres `crm_next_proposal_number(y)`
 * (criada na migration 0001). A função cuida da sequência anual sob demanda.
 * O ano usado é o do timestamp de gravação, no relógio do banco.
 */
export async function nextProposalNumber(
  runner: SqlRunner,
  year: number = new Date().getUTCFullYear(),
): Promise<string> {
  const rows = await runner.execute<{ crm_next_proposal_number: string }>(
    sql`select crm_next_proposal_number(${year}) as crm_next_proposal_number`,
  );
  const value = rows[0]?.crm_next_proposal_number;
  if (!value) throw new Error("crm_next_proposal_number não retornou valor");
  return value;
}
