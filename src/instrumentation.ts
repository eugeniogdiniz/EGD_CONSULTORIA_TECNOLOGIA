/**
 * Roda uma vez na inicialização do servidor Next. Importar o env aqui faz o
 * processo falhar no boot com a lista de variáveis inválidas, em vez de
 * responder 500 em cada página.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/env");
  }
}
