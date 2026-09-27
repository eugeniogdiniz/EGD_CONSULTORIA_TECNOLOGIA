import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proteção barata na borda: só verifica a existência do cookie de sessão.
 * A validação real da sessão e a checagem de papel ficam em
 * requireAdmin()/requirePortal() nos layouts dos grupos de rotas.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(getSessionCookie(req));

  if (!hasSession && (pathname.startsWith("/admin") || pathname.startsWith("/portal"))) {
    const url = new URL("/entrar", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasSession && pathname === "/entrar") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/portal/:path*", "/entrar"] };
