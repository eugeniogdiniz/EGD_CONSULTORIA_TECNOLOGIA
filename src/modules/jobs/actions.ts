import { db } from "@/lib/db";
import { jobSetting } from "@/db/schema";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { getJob, isJobKey } from "./registry";
import { parseTime } from "./schedule";
import { runManually, type RunOutcome } from "./runner";
import { isJobRunning } from "./queries";

export async function setJobEnabled(ctx: AdminContext, key: string, enabled: boolean): Promise<ActionResult<null>> {
  if (!isJobKey(key)) return fail("Automação não encontrada.");
  await db
    .insert(jobSetting)
    .values({ job: key, enabled, updatedBy: ctx.user.id })
    .onConflictDoUpdate({ target: jobSetting.job, set: { enabled, updatedAt: new Date(), updatedBy: ctx.user.id } });
  await audit({ actorId: ctx.user.id, action: "job.setting.updated", entityType: "job", entityId: key, metadata: { enabled } });
  return ok(null);
}

/** "Enviar agora": executa de verdade, com os dados atuais, sem consumir o período agendado. */
export async function triggerJob(ctx: AdminContext, key: string): Promise<ActionResult<RunOutcome>> {
  const job = getJob(key);
  if (!job) return fail("Automação não encontrada.");
  if (await isJobRunning(job.key)) return fail("Esta automação já está em execução. Aguarde ela terminar.");
  await audit({ actorId: ctx.user.id, action: "job.triggered", entityType: "job", entityId: job.key });
  const outcome = await runManually(job, ctx.user.id);
  return ok(outcome);
}

/** Horário da automação (Brasília). Vazio volta ao padrão do código. */
export async function setJobSchedule(ctx: AdminContext, key: string, time: string): Promise<ActionResult<null>> {
  if (!isJobKey(key)) return fail("Automação não encontrada.");
  const t = time.trim();
  const parsed = t === "" ? null : parseTime(t);
  if (t !== "" && !parsed) return fail("Horário inválido. Use HH:MM.");
  await db
    .insert(jobSetting)
    .values({ job: key, enabled: true, hour: parsed?.hour ?? null, minute: parsed?.minute ?? null, updatedBy: ctx.user.id })
    .onConflictDoUpdate({ target: jobSetting.job, set: { hour: parsed?.hour ?? null, minute: parsed?.minute ?? null, updatedAt: new Date(), updatedBy: ctx.user.id } });
  await audit({ actorId: ctx.user.id, action: "job.setting.updated", entityType: "job", entityId: key, metadata: { time: parsed ? `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}` : null } });
  return ok(null);
}
