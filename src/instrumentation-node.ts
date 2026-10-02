/**
 * Parte Node da inicialização. Fica num módulo separado (importado
 * dinamicamente por `instrumentation.ts` só quando NEXT_RUNTIME === "nodejs")
 * para o `process.exit` não entrar no bundle Edge, onde não é suportado e
 * gerava warning no build.
 */
export async function validateEnvOrExit() {
  try {
    await import("@/lib/env");
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  }
}

/** Sobe o agendador das automações (Fase 13) quando `JOBS_ENABLED` permite. Só depois do env validado. */
export async function startJobsScheduler() {
  const { startSchedulerIfEnabled } = await import("@/modules/jobs/scheduler");
  startSchedulerIfEnabled();
}
