import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";

/** CT-AA-NNN: ano com dois dígitos e sequência anual com pelo menos três. */
export function formatContractNumber(year: number, seq: number): string {
  const yy = (((year % 100) + 100) % 100).toString().padStart(2, "0");
  return `CT-${yy}-${seq.toString().padStart(3, "0")}`;
}

type SqlRunner = Pick<Db, "execute">;

/** Próximo número pela função Postgres `crm_next_contract_number(y)` (migration 0021), igual à das propostas. */
export async function nextContractNumber(runner: SqlRunner, year: number = new Date().getUTCFullYear()): Promise<string> {
  const rows = await runner.execute<{ n: string }>(sql`select crm_next_contract_number(${year}) as n`);
  const value = rows[0]?.n;
  if (!value) throw new Error("crm_next_contract_number não retornou valor");
  return value;
}
