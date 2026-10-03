"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { createWebhook, resendDelivery, setWebhookActive, testWebhook, updateWebhook } from "./actions";

const input = (fd: FormData) => ({ name: String(fd.get("name") ?? ""), url: String(fd.get("url") ?? ""), events: fd.getAll("events").map(String) });

export async function createWebhookForm(_p: ActionResult<{ id: string; secret: string }> | null, fd: FormData): Promise<ActionResult<{ id: string; secret: string }> | null> {
  const ctx = await requireOwner();
  const r = await createWebhook(ctx, input(fd));
  if (r.ok) revalidatePath("/admin/api");
  return r;
}

export async function updateWebhookForm(_p: ActionResult<null> | null, fd: FormData): Promise<ActionResult<null> | null> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const r = await updateWebhook(ctx, id, input(fd));
  if (r.ok) {
    revalidatePath("/admin/api");
    revalidatePath(`/admin/api/webhooks/${id}`);
  }
  return r;
}

export async function setWebhookActiveForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  await setWebhookActive(ctx, id, fd.get("active") === "1");
  revalidatePath("/admin/api");
  revalidatePath(`/admin/api/webhooks/${id}`);
}

export async function testWebhookForm(_p: ActionResult<{ ok: boolean; status: number | null; error: string | null }> | null, fd: FormData): Promise<ActionResult<{ ok: boolean; status: number | null; error: string | null }> | null> {
  const ctx = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const r = await testWebhook(ctx, id);
  revalidatePath("/admin/api");
  revalidatePath(`/admin/api/webhooks/${id}`);
  return r;
}

export async function resendDeliveryForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await resendDelivery(ctx, String(fd.get("deliveryId") ?? ""));
  revalidatePath(`/admin/api/webhooks/${String(fd.get("endpointId") ?? "")}`);
}
