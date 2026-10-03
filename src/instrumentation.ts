/**
 * Roda uma vez na inicialização do servidor Next. Valida o env aqui: se
 * faltar variável, o processo sai com código 1 (o container não sobe),
 * em vez de responder 500 em cada página com o healthcheck verde.
 * A saída com `process.exit` vive em `instrumentation-node.ts` para não
 * aparecer no bundle Edge.
 */
/**
 * Erros de renderização, rotas e server actions (Fase 20): agrupados em `app_error`
 * e, quando a origem é nova, avisados ao dono. Nunca lança.
 */
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routerKind: string; routePath: string; routeType: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportRequestError } = await import("./instrumentation-node");
  await reportRequestError(err, request, context);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validateEnvOrExit, startJobsScheduler } = await import("./instrumentation-node");
  await validateEnvOrExit();
  await startJobsScheduler();
}
