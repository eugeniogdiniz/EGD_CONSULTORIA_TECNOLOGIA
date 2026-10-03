/**
 * Decide se este processo deve tentar executar o período corrente de uma
 * automação, dado o que já existe no livro-razão (`job_run`) para
 * (job, period_key). Pura: o runner traz as linhas e tenta inserir a
 * tentativa devolvida; conflito no índice único = outro processo chegou antes.
 */
export type RunLedgerRow = { status: "running" | "ok" | "error"; attempt: number; startedAt: Date };

export type ClaimOptions = { maxAttempts?: number; staleMinutes?: number; /** espera (min) antes da 2ª e da 3ª tentativa */ backoffMinutes?: number[] };

/** Padrão da Fase 21: 5 min depois da 1ª falha, 15 min depois da 2ª. */
export const DEFAULT_BACKOFF_MINUTES = [5, 15];

export function decideClaim(runs: RunLedgerRow[], now: Date, opts: ClaimOptions = {}): { attempt: number } | null {
  const maxAttempts = opts.maxAttempts ?? 3;
  const staleMs = (opts.staleMinutes ?? 15) * 60_000;
  const backoff = opts.backoffMinutes ?? DEFAULT_BACKOFF_MINUTES;
  if (runs.some((r) => r.status === "ok")) return null;
  const fresh = runs.some((r) => r.status === "running" && now.getTime() - r.startedAt.getTime() < staleMs);
  if (fresh) return null;
  const attempts = runs.reduce((m, r) => Math.max(m, r.attempt), 0);
  if (attempts >= maxAttempts) return null;
  // backoff: a tentativa seguinte só depois de esperar desde o início da última falha
  const last = runs.filter((r) => r.attempt === attempts && r.status === "error").sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
  if (last) {
    const wait = (backoff[attempts - 1] ?? backoff[backoff.length - 1] ?? 0) * 60_000;
    if (now.getTime() - last.startedAt.getTime() < wait) return null;
  }
  return { attempt: attempts + 1 };
}
