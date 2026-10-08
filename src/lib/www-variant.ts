/**
 * O mesmo endereço com e sem "www": o site abre pelos dois, e o Better Auth recusa
 * login de origem que não conhece (403 INVALID_ORIGIN). Em 08/10/2026 quem entrava
 * por www.egdsystem.com.br não conseguia logar. Endereço local ou IP não ganha par.
 */
export function wwwVariant(url: string | undefined): string[] {
  if (!url) return [];
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || /^[\d.]+$/.test(u.hostname) || !u.hostname.includes(".")) return [];
    u.hostname = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
    return [u.origin];
  } catch {
    return [];
  }
}
