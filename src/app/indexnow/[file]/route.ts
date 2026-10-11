import { env } from "@/lib/env";
import { keyFileName } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/**
 * Arquivo da chave do IndexNow: o Bing confere que a chave é nossa. Publicado na raiz como
 * /<chave>.txt (rewrite em next.config), porque o Bing só aceita URLs abaixo da pasta do arquivo.
 */
export async function GET(_req: Request, ctx: RouteContext<"/indexnow/[file]">) {
  const { file } = await ctx.params;
  const key = env.INDEXNOW_KEY;
  if (!key || file !== keyFileName(key)) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
