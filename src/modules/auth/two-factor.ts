import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { twoFactorEnabled: true } });
  return Boolean(u?.twoFactorEnabled);
}
