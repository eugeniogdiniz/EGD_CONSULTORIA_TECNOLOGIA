import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSetting } from "@/db/schema";

/** Chaves conhecidas e seus padrões. Sem linha no banco = padrão. */
export const SETTINGS = {
  "security.require_2fa_team": { default: false, label: "2FA obrigatório para a equipe", description: "Admins e colaboradores sem verificação em duas etapas só conseguem abrir Minha conta até ativar." },
  "security.require_2fa_client": { default: false, label: "2FA obrigatório para clientes", description: "Usuários do portal sem verificação em duas etapas só conseguem abrir Minha conta até ativar." },
} as const;
export type SettingKey = keyof typeof SETTINGS;
export const isSettingKey = (k: string): k is SettingKey => k in SETTINGS;

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof SETTINGS)[K]["default"]> {
  const row = await db.query.appSetting.findFirst({ where: eq(appSetting.key, key), columns: { value: true } });
  const def = SETTINGS[key].default;
  if (!row) return def;
  return (typeof row.value === typeof def ? row.value : def) as (typeof SETTINGS)[K]["default"];
}

export async function listSettings(): Promise<Record<SettingKey, boolean>> {
  const rows = await db.select({ key: appSetting.key, value: appSetting.value }).from(appSetting);
  const out = Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, v.default])) as Record<SettingKey, boolean>;
  for (const r of rows) if (isSettingKey(r.key) && typeof r.value === "boolean") out[r.key] = r.value;
  return out;
}

/** Memoizada por requisição: o layout e a página consultam a mesma chave. */
export const requireTwoFactorFor = cache(async (role: "admin" | "collaborator" | "client"): Promise<boolean> =>
  getSetting(role === "client" ? "security.require_2fa_client" : "security.require_2fa_team"),
);
