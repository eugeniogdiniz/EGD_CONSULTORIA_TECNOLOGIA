import { normalizeEmail } from "@/modules/auth/normalize-email";

/**
 * Domínios de e-mail "públicos" — não valem como pista de empresa. Se um
 * lead chega com joao@gmail.com, não faz sentido sugerir vincular a alguma
 * empresa qualquer que tenha um contato com esse mesmo domínio.
 */
export const PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.com.br",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "tutanota.com",
  "zoho.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "uol.com.br",
  "bol.com.br",
  "ig.com.br",
  "terra.com.br",
  "globo.com",
  "r7.com",
  "oi.com.br",
]);

export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return null;
  const domain = normalized.slice(at + 1);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ? domain : null;
}

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Título default da oportunidade quando se converte um lead do site — usado
 * no passo 3 do wizard e pré-preenchido para o admin editar.
 */
export function buildDefaultOpportunityTitle(leadName: string): string {
  const clean = leadName.trim().replace(/\s+/g, " ");
  return clean ? `Contato pelo site — ${clean}` : "Contato pelo site";
}
