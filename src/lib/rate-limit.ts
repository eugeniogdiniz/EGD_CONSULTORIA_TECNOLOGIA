/**
 * Limitador de taxa em memória do processo (janela deslizante).
 * Suficiente para um único container; a interface (`hit`) permite trocar
 * a implementação por Redis sem alterar os chamadores.
 */
export type RateLimiter = {
  hit(key: string, now?: number): { allowed: boolean; remaining: number };
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
  };
}
