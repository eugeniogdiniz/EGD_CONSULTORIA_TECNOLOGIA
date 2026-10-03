"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/modules/auth/context";
import { resolveError } from "./actions";

export async function resolveErrorForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await resolveError(ctx, String(fd.get("id") ?? ""));
  revalidatePath("/admin/erros");
}
