import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proteção barata na borda: só verifica a existência do cookie de sessão.
 * A validação real da sessão e a checagem de papel ficam em
 * requireAdmin()/requirePortal() nos layouts dos grupos de rotas.
 * Não redireciona /entrar com base no cookie: um cookie revogado criaria
 * um loop com os layouts; a própria página de login trata sessão válida.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!getSessionCookie(req)) {
    const url = new URL("/entrar", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/portal/:path*"] };
