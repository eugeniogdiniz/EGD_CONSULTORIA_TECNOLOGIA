import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Interruptor por automação. Sem linha = ligada. */
export const jobSetting = pgTable("job_setting", {
  job: text().primaryKey(),
  enabled: boolean().default(true).notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid(),
});

/**
 * Livro-razão das execuções. O índice único em (job, period_key, attempt)
 * garante que só um processo executa cada tentativa de um período agendado.
 * Execuções manuais têm period_key nulo e ficam fora do índice.
 */
export const jobRun = pgTable(
  "job_run",
  {
    id: uuid().primaryKey().defaultRandom(),
    job: text().notNull(),
    periodKey: text(),
    attempt: integer().default(1).notNull(),
    trigger: text({ enum: ["schedule", "manual"] }).notNull(),
    actorId: uuid(),
    status: text({ enum: ["running", "ok", "error"] }).notNull(),
    startedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp({ withTimezone: true }),
    summary: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    error: text(),
  },
  (t) => [
    uniqueIndex("job_run_period_uniq")
      .on(t.job, t.periodKey, t.attempt)
      .where(sql`${t.periodKey} is not null`),
    index("job_run_job_started_idx").on(t.job, t.startedAt.desc()),
    index("job_run_started_idx").on(t.startedAt.desc()),
  ],
);
