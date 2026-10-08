import { db } from "@/lib/db";
import { appSetting } from "@/db/schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isSettingKey, SETTINGS, type SettingKey } from "./queries";

/** Só o dono muda configurações (a form action usa `requireOwner`). */
export async function setSetting(ctx: AdminContext, key: string, value: boolean | string): Promise<ActionResult<null>> {
  if (!isSettingKey(key)) return fail("Configuração desconhecida.");
  if (typeof value !== typeof SETTINGS[key].default) return fail("Valor inválido para esta configuração.");
  if (typeof value === "string" && value.length > 300) return fail("Máximo 300 caracteres.");
  await db
    .insert(appSetting)
    .values({ key, value, updatedBy: ctx.user.id })
    .onConflictDoUpdate({ target: appSetting.key, set: { value, updatedAt: new Date(), updatedBy: ctx.user.id } });
  await audit({ actorId: ctx.user.id, action: "setting.updated", entityType: "app_setting", entityId: key as SettingKey, metadata: { key, value } });
  return ok(null);
}
