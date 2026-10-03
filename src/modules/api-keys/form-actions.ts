"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { createApiKey, revokeApiKey } from "./actions";

export async function createApiKeyForm(
  _p: ActionResult<{ id: string; key: string }> | null,
  fd: FormData,
): Promise<ActionResult<{ id: string; key: string }> | null> {
  const ctx = await requireOwner();
  const r = await createApiKey(ctx, {
    name: String(fd.get("name") ?? ""),
    scopes: fd.getAll("scopes").map(String),
  });
  if (r.ok) revalidatePath("/admin/api");
  return r;
}

export async function revokeApiKeyForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await revokeApiKey(ctx, String(fd.get("id") ?? ""));
  revalidatePath("/admin/api");
}
