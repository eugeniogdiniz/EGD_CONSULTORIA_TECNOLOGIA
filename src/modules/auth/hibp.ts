import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";

/**
 * Verifica a senha contra a base do Have I Been Pwned usando k-anonimato:
 * só os 5 primeiros caracteres do SHA-1 saem do servidor. Em falha de rede
 * ou da API, aceita a senha (fail-open) e registra aviso.
 */
export async function isPwnedPassword(password: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HIBP status ${res.status}`);
    const text = await res.text();
    return text.split(/\r?\n/).some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch (err) {
    logger.warn("hibp.unavailable", { err: String(err) });
    return false;
  }
}
