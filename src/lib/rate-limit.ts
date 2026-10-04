/**
 * Limitadores de taxa com a mesma interface:
 * - `createRateLimiter`: em memória (janela deslizante), para testes e usos locais;
 * - `createPgRateLimiter`: no banco (janela fixa), compartilhado entre containers (Fase 20).
 */
import { sql } from "drizzle-orm";
import type { Db as AppDb } from "@/lib/db";

export type RateLimiter = {
  hit(key: string, now?: number): { allowed: boolean; remaining: number };
  /** Zera o contador de uma chave (ex.: após login bem-sucedido). */
  reset(key: string): void;
};

export type AsyncRateLimiter = {
  hit(key: string, now?: number): Promise<{ allowed: boolean; remaining: number }>;
  reset(key: string): Promise<void>;
};

export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }): RateLimiter {
  const hits = new Map<string, number[]>();

  function sweep(now: number) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return { allowed: false, remaining: 0 };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 10_000) sweep(now);
      return { allowed: true, remaining: max - recent.length };
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

/** Início da janela fixa que contém `now` (puro, testável). */
export const windowStart = (now: number, windowMs: number): Date => new Date(Math.floor(now / windowMs) * windowMs);

type Db = Pick<AppDb, "execute">;

/**
 * Janela fixa no banco: `insert … on conflict do update set count = count + 1 returning count`.
 * Uma linha por (chave, janela); as janelas velhas são apagadas pela automação de limpeza.
 * `scope` separa os usos (ex.: "contato", "api-ip") na mesma tabela.
 */
export function createPgRateLimiter(db: Db, { scope, windowMs, max }: { scope: string; windowMs: number; max: number }): AsyncRateLimiter {
  const k = (key: string) => `${scope}:${key}`;
  return {
    async hit(key, now = Date.now()) {
      // `db.execute` com sql cru não serializa Date: vai como ISO com cast
      const ws = windowStart(now, windowMs).toISOString();
      const [row] = await db.execute<{ count: number }>(sql`
        insert into rate_limit_bucket (key, window_start, count) values (${k(key)}, ${ws}::timestamptz, 1)
        on conflict (key, window_start) do update set count = rate_limit_bucket.count + 1
        returning count
      `);
      const count = Number(row?.count ?? 1);
      return { allowed: count <= max, remaining: Math.max(0, max - count) };
    },
    async reset(key) {
      await db.execute(sql`delete from rate_limit_bucket where key = ${k(key)}`);
    },
  };
}

/** Apaga janelas anteriores a `before` (limpeza diária). Devolve quantas linhas saíram. */
export async function sweepRateLimitBuckets(db: Db, before: Date): Promise<number> {
  const rows = await db.execute<{ key: string }>(sql`delete from rate_limit_bucket where window_start < ${before.toISOString()}::timestamptz returning key`);
  return rows.length;
}
