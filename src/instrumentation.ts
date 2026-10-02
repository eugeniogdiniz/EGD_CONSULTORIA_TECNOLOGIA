/**
 * Roda uma vez na inicialização do servidor Next. Valida o env aqui: se
 * faltar variável, o processo sai com código 1 (o container não sobe),
 * em vez de responder 500 em cada página com o healthcheck verde.
 * A saída com `process.exit` vive em `instrumentation-node.ts` para não
 * aparecer no bundle Edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validateEnvOrExit } = await import("./instrumentation-node");
  await validateEnvOrExit();
}
