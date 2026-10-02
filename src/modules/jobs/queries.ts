import { desc, eq, inArray, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobRun, jobSetting, users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { JOBS, JOB_KEYS, type JobKey } from "./registry";

/** Automações desligadas na tela (sem linha = ligada). */
export async function listDisabledJobKeys(): Promise<Set<JobKey>> {
  const rows = await db.select({ job: jobSetting.job, enabled: jobSetting.enabled }).from(jobSetting).where(eq(jobSetting.enabled, false));
  return new Set(rows.map((r) => r.job).filter((k): k is JobKey => (JOB_KEYS as readonly string[]).includes(k)));
}

const STALE_MS = 15 * 60_000;

export type JobRow = {
  key: JobKey;
  name: string;
  description: string;
  enabled: boolean;
  recipients: string;
  lastRun: { id: string; status: "running" | "ok" | "error"; startedAt: Date; finishedAt: Date | null; text: string; error: string | null } | null;
  running: boolean;
};

export async function listJobsWithLastRun(_ctx: AdminContext, now = new Date()): Promise<JobRow[]> {
  const disabled = await listDisabledJobKeys();
  const latest = await db
    .selectDistinctOn([jobRun.job], {
      id: jobRun.id,
      job: jobRun.job,
      status: jobRun.status,
      startedAt: jobRun.startedAt,
      finishedAt: jobRun.finishedAt,
      summary: jobRun.summary,
      error: jobRun.error,
    })
    .from(jobRun)
    .where(inArray(jobRun.job, [...JOB_KEYS]))
    .orderBy(jobRun.job, desc(jobRun.startedAt));
  const running = await db
    .select({ job: jobRun.job })
    .from(jobRun)
    .where(and(eq(jobRun.status, "running"), gt(jobRun.startedAt, new Date(now.getTime() - STALE_MS))));
  const runningSet = new Set(running.map((r) => r.job));
  return Promise.all(
    JOBS.map(async (j) => {
      const last = latest.find((l) => l.job === j.key);
      return {
        key: j.key,
        name: j.name,
        description: j.description,
        enabled: !disabled.has(j.key),
        recipients: await j.recipients(),
        lastRun: last
          ? { id: last.id, status: last.status, startedAt: last.startedAt, finishedAt: last.finishedAt, text: String(last.summary.text ?? ""), error: last.error }
          : null,
        running: runningSet.has(j.key),
      };
    }),
  );
}

export function listRuns(_ctx: AdminContext, limit = 30) {
  return db
    .select({
      id: jobRun.id,
      job: jobRun.job,
      periodKey: jobRun.periodKey,
      attempt: jobRun.attempt,
      trigger: jobRun.trigger,
      actorName: users.name,
      status: jobRun.status,
      startedAt: jobRun.startedAt,
      finishedAt: jobRun.finishedAt,
      summary: jobRun.summary,
      error: jobRun.error,
    })
    .from(jobRun)
    .leftJoin(users, eq(jobRun.actorId, users.id))
    .orderBy(desc(jobRun.startedAt))
    .limit(limit);
}

/** Há execução em andamento (e não abandonada) desta automação? */
export async function isJobRunning(key: JobKey, now = new Date()): Promise<boolean> {
  const [row] = await db
    .select({ id: jobRun.id })
    .from(jobRun)
    .where(and(eq(jobRun.job, key), eq(jobRun.status, "running"), gt(jobRun.startedAt, new Date(now.getTime() - STALE_MS))))
    .limit(1);
  return Boolean(row);
}
