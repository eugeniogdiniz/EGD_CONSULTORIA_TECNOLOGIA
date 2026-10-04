import { requireOwner } from "@/modules/auth/context";
import { env } from "@/lib/env";

/** Gera um erro de servidor de propósito (só fora de produção, ou no servidor da suíte E2E) para conferir o rastreio. */
export async function GET() {
  await requireOwner();
  if (env.NODE_ENV === "production" && env.E2E !== "1") return new Response("Indisponível em produção", { status: 404 });
  throw new Error("Erro de teste do rastreio (Fase 20)");
}
