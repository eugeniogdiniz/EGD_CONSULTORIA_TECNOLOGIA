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
