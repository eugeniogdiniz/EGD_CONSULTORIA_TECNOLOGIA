import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { detectAiBot } from "@/content/ai-bots";

/**
 * Duas tarefas baratas na borda:
 *
 * 1. /admin e /portal: só verifica a existência do cookie de sessão. A validação real da
 *    sessão e a checagem de papel ficam em requireAdmin()/requirePortal() nos layouts dos
 *    grupos de rotas. Não redireciona /entrar com base no cookie: um cookie revogado criaria
 *    um loop com os layouts; a própria página de login trata sessão válida.
 *
 * 2. Site público: registra no log (uma linha JSON, `msg: "robo_ia"`) cada acesso de robô de
 *    busca ou de IA (GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bingbot...). É como saber
 *    se as IAs estão lendo as páginas e o llms.txt: `grep robo_ia` no log do container.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/portal")) {
    if (!getSessionCookie(req)) {
      const url = new URL("/entrar", req.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  const bot = detectAiBot(req.headers.get("user-agent"));
  // mesmo formato do `logger` (lib/logger.ts), sem importá-lo: o proxy não precisa de node:crypto
  if (bot) console.log(JSON.stringify({ level: "info", msg: "robo_ia", ts: new Date().toISOString(), bot, path: pathname }));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/((?!_next/|api/|brand/|modelos/|favicon\\.ico).*)"],
};
