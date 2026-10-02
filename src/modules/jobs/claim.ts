/**
 * Decide se este processo deve tentar executar o período corrente de uma
 * automação, dado o que já existe no livro-razão (`job_run`) para
 * (job, period_key). Pura: o runner traz as linhas e tenta inserir a
 * tentativa devolvida; conflito no índice único = outro processo chegou antes.
 */
export type RunLedgerRow = { status: "running" | "ok" | "error"; attempt: number; startedAt: Date };

export type ClaimOptions = { maxAttempts?: number; staleMinutes?: number };

export function decideClaim(runs: RunLedgerRow[], now: Date, opts: ClaimOptions = {}): { attempt: number } | null {
  const maxAttempts = opts.maxAttempts ?? 3;
  const staleMs = (opts.staleMinutes ?? 15) * 60_000;
  if (runs.some((r) => r.status === "ok")) return null;
  const fresh = runs.some((r) => r.status === "running" && now.getTime() - r.startedAt.getTime() < staleMs);
  if (fresh) return null;
  const attempts = runs.reduce((m, r) => Math.max(m, r.attempt), 0);
  if (attempts >= maxAttempts) return null;
  return { attempt: attempts + 1 };
}
