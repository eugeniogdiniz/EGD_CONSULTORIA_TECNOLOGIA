"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requirePortal } from "@/modules/auth/context";
import { markAllRead, setPreference } from "./actions";

export async function markAllReadAdminForm(): Promise<void> {
  const ctx = await requireAdmin();
  await markAllRead(ctx);
  revalidatePath("/admin", "layout");
}

export async function markAllReadPortalForm(): Promise<void> {
  const ctx = await requirePortal();
  await markAllRead(ctx);
  revalidatePath("/portal", "layout");
}

export async function setPreferenceAdminForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await setPreference(ctx, String(fd.get("kind") ?? ""), fd.get("email") === "1");
  revalidatePath("/admin/conta");
}

export async function setPreferencePortalForm(fd: FormData): Promise<void> {
  const ctx = await requirePortal();
  await setPreference(ctx, String(fd.get("kind") ?? ""), fd.get("email") === "1");
  revalidatePath("/portal/conta");
}
