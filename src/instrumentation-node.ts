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

/** Gancho do `onRequestError`: grava o erro agrupado e avisa o dono quando a origem é nova. */
export async function reportRequestError(err: unknown, request: { path: string; method: string }, context: { routerKind: string; routePath: string; routeType: string }) {
  try {
    // redirect()/notFound() do Next chegam aqui como erros de controle de fluxo: ignorar
    const digest = (err as { digest?: string } | null)?.digest ?? "";
    if (typeof digest === "string" && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test(digest)) return;
    const { captureError } = await import("@/modules/errors/capture");
    const r = await captureError(err, { path: request.path, method: request.method, routeKind: `${context.routerKind} · ${context.routeType} ${context.routePath}` });
    if (r?.isNew) {
      const { notifyErrorSpike } = await import("@/modules/notifications/events");
      const e = err instanceof Error ? err : new Error(String(err));
      await notifyErrorSpike({ errorId: r.id, name: e.name, message: e.message, path: request.path });
    }
  } catch (inner) {
    console.error(JSON.stringify({ level: "error", msg: "on_request_error.failed", err: String(inner) }));
  }
}
