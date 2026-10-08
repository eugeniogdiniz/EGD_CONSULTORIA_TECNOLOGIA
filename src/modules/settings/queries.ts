import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSetting } from "@/db/schema";

/** Chaves conhecidas e seus padrões. Sem linha no banco = padrão. */
export const SETTINGS = {
  "security.require_2fa_team": { default: false, label: "2FA obrigatório para a equipe", description: "Admins e colaboradores sem verificação em duas etapas só conseguem abrir Minha conta até ativar." },
  "security.require_2fa_client": { default: false, label: "2FA obrigatório para clientes", description: "Usuários do portal sem verificação em duas etapas só conseguem abrir Minha conta até ativar." },
  // Dados jurídicos da EGD (Fase 23): entram no contrato e no termo de aceite
  "legal.razao_social": { default: "", label: "Razão social", description: "Nome empresarial que assina os contratos." },
  "legal.cnpj": { default: "", label: "CNPJ", description: "Só números ou com pontuação." },
  "legal.endereco": { default: "", label: "Endereço da sede", description: "Logradouro, número, complemento, cidade, UF e CEP." },
  "legal.representante": { default: "", label: "Representante legal", description: "Quem assina pela EGD." },
  "legal.cargo": { default: "Consultor em Tecnologia", label: "Cargo do representante", description: "Como aparece na assinatura." },
  "legal.foro": { default: "São Paulo/SP", label: "Foro", description: "Comarca para a cláusula de solução de divergências." },
} as const;
export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]["default"];
export const isSettingKey = (k: string): k is SettingKey => k in SETTINGS;
export const BOOLEAN_SETTINGS = (Object.keys(SETTINGS) as SettingKey[]).filter((k) => typeof SETTINGS[k].default === "boolean");
export const LEGAL_SETTINGS = (Object.keys(SETTINGS) as SettingKey[]).filter((k) => k.startsWith("legal."));

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await db.query.appSetting.findFirst({ where: eq(appSetting.key, key), columns: { value: true } });
  const def = SETTINGS[key].default;
  if (!row) return def;
  return (typeof row.value === typeof def ? row.value : def) as SettingValue<K>;
}

export async function listSettings(): Promise<{ [K in SettingKey]: SettingValue<K> }> {
  const rows = await db.select({ key: appSetting.key, value: appSetting.value }).from(appSetting);
  const out = Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, v.default])) as { [K in SettingKey]: SettingValue<K> };
  for (const r of rows) if (isSettingKey(r.key) && typeof r.value === typeof SETTINGS[r.key].default) (out as Record<string, unknown>)[r.key] = r.value;
  return out;
}

/** Dados jurídicos da EGD num objeto só (contrato, termo de aceite). */
export async function getLegalSettings() {
  const all = await listSettings();
  return { razaoSocial: all["legal.razao_social"], cnpj: all["legal.cnpj"], endereco: all["legal.endereco"], representante: all["legal.representante"], cargo: all["legal.cargo"], foro: all["legal.foro"] };
}

/** Memoizada por requisição: o layout e a página consultam a mesma chave. */
export const requireTwoFactorFor = cache(async (role: "admin" | "collaborator" | "client"): Promise<boolean> =>
  getSetting(role === "client" ? "security.require_2fa_client" : "security.require_2fa_team"),
);
