/**
 * Roda uma vez na inicialização do servidor Next. Valida o env aqui: se
 * faltar variável, o processo sai com código 1 (o container não sobe),
 * em vez de responder 500 em cada página com o healthcheck verde.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    await import("@/lib/env");
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  }
}
