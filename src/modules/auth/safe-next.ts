/**
 * Valida o parâmetro `next` do login: só caminhos internos, sem esquemas,
 * sem `//` nem `\` (o parser de URL trata `\` como `/`, então `/\evil.com`
 * viraria `https://evil.com`). Devolve pathname + search ou null.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!/^\/(?![/\\])/.test(next)) return null;
  if (/[\\\u0000-\u001f]/.test(next)) return null;
  try {
    const base = "http://internal.invalid";
    const u = new URL(next, base);
    if (u.origin !== base) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}
