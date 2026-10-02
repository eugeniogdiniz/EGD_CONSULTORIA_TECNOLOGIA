"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requirePortal } from "@/modules/auth/context";
import { setOrganizationWeeklyDigest } from "@/modules/tenancy/actions";
import { setJobEnabled, triggerJob } from "./actions";

export async function setJobEnabledForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await setJobEnabled(ctx, String(fd.get("job") ?? ""), fd.get("enabled") === "1");
  revalidatePath("/admin/automacoes");
}

export async function triggerJobForm(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  await triggerJob(ctx, String(fd.get("job") ?? ""));
  revalidatePath("/admin/automacoes");
}

/** Interruptor do resumo semanal em /portal/conta: vale para a organização ativa. */
export async function setWeeklyDigestPortalForm(fd: FormData): Promise<void> {
  const ctx = await requirePortal();
  await setOrganizationWeeklyDigest(ctx, ctx.organization.id, fd.get("enabled") === "1");
  revalidatePath("/portal/conta");
}
