/**
 * Executa uma automação registrando no livro-razão. A reivindicação de um
 * período agendado é o `insert` em `job_run`: se outro processo inseriu a
 * mesma (job, period_key, attempt) antes, o índice único recusa e este pula.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobRun } from "@/db/schema";
import { logger } from "@/lib/logger";
import { isUniqueViolation } from "@/lib/pg-errors";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { decideClaim } from "./claim";
import { periodKey } from "./schedule";
import { baseUrl, type JobDefinition, type JobSummary } from "./registry";

export type RunOutcome = { runId: string; status: "ok" | "error"; summary: JobSummary | null; error: string | null };

async function execute(runId: string, job: JobDefinition, now: Date): Promise<RunOutcome> {
  const ctx = { now, today: todayInSaoPaulo(now), baseUrl: baseUrl() };
  try {
    const summary = await job.run(ctx);
    await db.update(jobRun).set({ status: "ok", finishedAt: new Date(), summary }).where(eq(jobRun.id, runId));
    logger.info("job.ok", { job: job.key, runId, summary: summary.text });
    return { runId, status: "ok", summary, error: null };
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await db.update(jobRun).set({ status: "error", finishedAt: new Date(), error: message.slice(0, 2000) }).where(eq(jobRun.id, runId));
    logger.error("job.failed", { job: job.key, runId, err: message });
    return { runId, status: "error", summary: null, error: message };
  }
}

/**
 * Tenta executar o período corrente de `job`. Devolve `null` quando não há o
 * que fazer (já executou, está em execução, esgotou tentativas ou outro
 * processo reivindicou antes).
 */
export async function claimAndRun(job: JobDefinition, now: Date, schedule = job.schedule): Promise<RunOutcome | null> {
  const key = periodKey(schedule, now);
  const runs = await db
    .select({ status: jobRun.status, attempt: jobRun.attempt, startedAt: jobRun.startedAt })
    .from(jobRun)
    .where(and(eq(jobRun.job, job.key), eq(jobRun.periodKey, key)));
  const claim = decideClaim(runs, now);
  if (!claim) return null;
  let runId: string;
  try {
    const [row] = await db
      .insert(jobRun)
      .values({ job: job.key, periodKey: key, attempt: claim.attempt, trigger: "schedule", status: "running", startedAt: now })
      .returning({ id: jobRun.id });
    runId = row.id;
  } catch (err) {
    // outro processo (ou outro tique) reivindicou esta tentativa antes
    if (isUniqueViolation(err)) return null;
    throw err;
  }
  return execute(runId, job, now);
}

/** Execução pedida por um admin ("Enviar agora"). Não consome o período agendado. */
export async function runManually(job: JobDefinition, actorId: string, now = new Date()): Promise<RunOutcome> {
  const [row] = await db
    .insert(jobRun)
    .values({ job: job.key, periodKey: null, attempt: 1, trigger: "manual", actorId, status: "running", startedAt: now })
    .returning({ id: jobRun.id });
  return execute(row.id, job, now);
}
