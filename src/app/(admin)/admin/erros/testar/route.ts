import { requireOwner } from "@/modules/auth/context";
import { env } from "@/lib/env";

/** Gera um erro de servidor de propósito (só fora de produção) para conferir o rastreio. */
export async function GET() {
  await requireOwner();
  if (env.NODE_ENV === "production") return new Response("Indisponível em produção", { status: 404 });
  throw new Error("Erro de teste do rastreio (Fase 20)");
}
