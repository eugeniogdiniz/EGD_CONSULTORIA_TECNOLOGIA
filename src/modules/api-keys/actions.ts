import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKey } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { generateApiKey, isScope } from "./keys";

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
    .values({ name: parsed.data.name, prefix, keyHash: hash, scopes: [...new Set(parsed.data.scopes)], createdBy: ctx.user.id })
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
