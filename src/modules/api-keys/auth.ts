import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKey } from "@/db/schema";
import { createRateLimiter } from "@/lib/rate-limit";
import { hasScope, hashApiKey, parseBearer, type Scope } from "./keys";

const limiter = createRateLimiter({ windowMs: 60_000, max: 120 });
// Por IP, antes de tocar o banco: quem só erra a chave é freado; uma autenticação válida zera o contador.
const ipLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
const TOUCH_EVERY_MS = 60_000;

export function apiError(status: number, code: string, message: string, headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export type ApiKeyAuth =
  | { ok: true; key: { id: string; name: string } }
  | { ok: false; response: Response };

/**
 * Autentica uma chamada da API pública: Bearer → chave ativa → escopo → limite por chave.
 * Erros usam o mesmo corpo `{ error: { code, message } }`.
 */
export async function authenticateApiKey(req: Request, scope: Scope): Promise<ApiKeyAuth> {
  const ip = clientIp(req);
  if (!ipLimiter.hit(ip).allowed)
    return { ok: false, response: apiError(429, "rate_limited", "Muitas tentativas. Aguarde um minuto.", { "Retry-After": "60" }) };

  const raw = parseBearer(req.headers.get("authorization"));
  if (!raw) return { ok: false, response: apiError(401, "unauthorized", "Envie Authorization: Bearer <chave>.") };

  const row = await db.query.apiKey.findFirst({
    where: and(eq(apiKey.keyHash, hashApiKey(raw)), isNull(apiKey.revokedAt)),
    columns: { id: true, name: true, scopes: true, lastUsedAt: true },
  });
  if (!row) return { ok: false, response: apiError(401, "unauthorized", "Chave inválida ou revogada.") };
  if (!hasScope(row.scopes, scope))
    return { ok: false, response: apiError(403, "forbidden", `A chave não tem o escopo ${scope}.`) };

  ipLimiter.reset(ip);
  if (!limiter.hit(row.id).allowed)
    return { ok: false, response: apiError(429, "rate_limited", "Limite de 120 requisições por minuto.", { "Retry-After": "60" }) };

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, row.id));
  }
  return { ok: true, key: { id: row.id, name: row.name } };
}
