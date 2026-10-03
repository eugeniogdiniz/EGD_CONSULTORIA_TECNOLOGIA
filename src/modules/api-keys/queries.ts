import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKey, users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";

/** Nunca devolve `keyHash`: a listagem só precisa do prefixo. */
export function listApiKeys(_ctx: AdminContext) {
  return db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      expiresAt: apiKey.expiresAt,
      rotatedToId: apiKey.rotatedToId,
      createdAt: apiKey.createdAt,
      createdByName: users.name,
    })
    .from(apiKey)
    .innerJoin(users, eq(apiKey.createdBy, users.id))
    .orderBy(desc(apiKey.createdAt));
}
