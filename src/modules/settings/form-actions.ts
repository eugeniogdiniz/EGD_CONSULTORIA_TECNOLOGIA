"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/modules/auth/context";
import { setSetting } from "./actions";

export async function setSettingForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner({ allowWithout2fa: true });
  await setSetting(ctx, String(fd.get("key") ?? ""), fd.get("value") === "1");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin", "layout");
}

/** Dados jurídicos: vários campos de texto num formulário só. */
export async function setLegalSettingsForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner({ allowWithout2fa: true });
  for (const key of ["legal.razao_social", "legal.cnpj", "legal.endereco", "legal.representante", "legal.cargo", "legal.foro"]) {
    if (fd.has(key)) await setSetting(ctx, key, String(fd.get(key) ?? "").trim());
  }
  revalidatePath("/admin/configuracoes");
}
