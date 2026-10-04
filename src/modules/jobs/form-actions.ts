"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requirePortal } from "@/modules/auth/context";
import { setOrganizationWeeklyDigest } from "@/modules/tenancy/actions";
import { setJobEnabled, setJobSchedule, triggerJob } from "./actions";

export async function setJobEnabledForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await setJobEnabled(ctx, String(fd.get("job") ?? ""), fd.get("enabled") === "1");
  revalidatePath("/admin/automacoes");
}

export async function triggerJobForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await triggerJob(ctx, String(fd.get("job") ?? ""));
  revalidatePath("/admin/automacoes");
}

/** Interruptor do resumo semanal em /portal/conta: vale para a organização ativa. */
export async function setWeeklyDigestPortalForm(fd: FormData): Promise<void> {
  const ctx = await requirePortal();
  await setOrganizationWeeklyDigest(ctx, ctx.organization.id, fd.get("enabled") === "1");
  revalidatePath("/portal/conta");
}

export async function setJobScheduleForm(fd: FormData): Promise<void> {
  const ctx = await requireOwner();
  await setJobSchedule(ctx, String(fd.get("job") ?? ""), String(fd.get("time") ?? ""));
  revalidatePath("/admin/automacoes");
}
