import { and, eq, gt, isNotNull, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKey } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { generateApiKey, isScope } from "./keys";

export const KEY_TTL_DAYS = 365;
export const ROTATION_GRACE_DAYS = 7;
export const defaultExpiry = (now = new Date()) => new Date(now.getTime() + KEY_TTL_DAYS * 86_400_000);

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  scopes: z
    .array(z.string())
    .min(1, "Escolha ao menos um escopo.")
    .refine((l) => l.every(isScope), "Escopo desconhecido."),
});
export type CreateApiKeyInput = z.input<typeof createApiKeySchema>;

/** Devolve a chave em claro UMA vez; depois só existe o hash. */
export async function createApiKey(
  ctx: AdminContext,
  input: CreateApiKeyInput,
): Promise<ActionResult<{ id: string; key: string }>> {
  const parsed = createApiKeySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { key, prefix, hash } = generateApiKey();
  const [row] = await db
    .insert(apiKey)
    .values({ name: parsed.data.name, prefix, keyHash: hash, scopes: [...new Set(parsed.data.scopes)], createdBy: ctx.user.id, expiresAt: defaultExpiry() })
    .returning({ id: apiKey.id });
  await audit({
    actorId: ctx.user.id,
    action: "api_key.created",
    entityType: "api_key",
    entityId: row.id,
    metadata: { name: parsed.data.name, prefix, scopes: parsed.data.scopes },
  });
  return ok({ id: row.id, key });
}

export async function revokeApiKey(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Chave não encontrada.");
  const [row] = await db
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.id, id), isNull(apiKey.revokedAt)))
    .returning({ id: apiKey.id, prefix: apiKey.prefix });
  if (!row) return fail("Chave não encontrada ou já revogada.");
  await audit({
    actorId: ctx.user.id,
    action: "api_key.revoked",
    entityType: "api_key",
    entityId: id,
    metadata: { prefix: row.prefix },
  });
  return ok(null);
}

/**
 * Rotação sem janela sem serviço: cria a chave nova (mesmo nome e escopos, validade nova)
 * e agenda a revogação da antiga para daqui a 7 dias. O segredo novo aparece uma vez.
 */
export async function rotateApiKey(ctx: AdminContext, id: string, now = new Date()): Promise<ActionResult<{ id: string; key: string; oldRevokesAt: Date }>> {
  if (!isUuid(id)) return fail("Chave não encontrada.");
  const old = await db.query.apiKey.findFirst({ where: eq(apiKey.id, id) });
  if (!old || (old.revokedAt && old.revokedAt <= now)) return fail("Chave não encontrada ou já revogada.");
  if (old.rotatedToId) return fail("Esta chave já foi rotacionada.");
  const { key, prefix, hash } = generateApiKey();
  const oldRevokesAt = new Date(now.getTime() + ROTATION_GRACE_DAYS * 86_400_000);
  const newId = await db.transaction(async (tx) => {
    const [n] = await tx
      .insert(apiKey)
      .values({ name: old.name, prefix, keyHash: hash, scopes: old.scopes, createdBy: ctx.user.id, expiresAt: defaultExpiry(now) })
      .returning({ id: apiKey.id });
    await tx.update(apiKey).set({ revokedAt: oldRevokesAt, rotatedToId: n.id }).where(eq(apiKey.id, id));
    return n.id;
  });
  await audit({ actorId: ctx.user.id, action: "api_key.rotated", entityType: "api_key", entityId: id, metadata: { newId, oldPrefix: old.prefix, newPrefix: prefix, oldRevokesAt } });
  return ok({ id: newId, key, oldRevokesAt });
}

/** Chaves ativas que expiram em até `days` dias (para o aviso diário). */
export async function listExpiringApiKeys(now: Date, days: number) {
  const limit = new Date(now.getTime() + days * 86_400_000);
  return db
    .select({ id: apiKey.id, name: apiKey.name, prefix: apiKey.prefix, expiresAt: apiKey.expiresAt })
    .from(apiKey)
    .where(and(isNotNull(apiKey.expiresAt), gt(apiKey.expiresAt, now), lte(apiKey.expiresAt, limit), or(isNull(apiKey.revokedAt), gt(apiKey.revokedAt, now))));
}
