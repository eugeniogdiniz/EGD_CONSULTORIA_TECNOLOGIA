import { createHash, randomBytes } from "node:crypto";

export const SCOPES = ["cases:read", "leads:write"] as const;
export type Scope = (typeof SCOPES)[number];

export const SCOPE_LABEL: Record<Scope, string> = {
  "cases:read": "Ler cases publicados",
  "leads:write": "Enviar leads (webhook de entrada)",
};

const PREFIX_LENGTH = 12; // "egd_" + 8 caracteres

/** 256 bits de entropia: sha256 sem sal basta (não é senha escolhida por gente). */
export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `egd_${randomBytes(32).toString("base64url")}`;
  return { key, prefix: key.slice(0, PREFIX_LENGTH), hash: hashApiKey(key) };
}

/** Extrai a chave de "Authorization: Bearer <chave>". */
export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(egd_[A-Za-z0-9_-]{20,})$/.exec(header.trim());
  return m ? m[1] : null;
}

export const hasScope = (scopes: readonly string[], required: Scope) => scopes.includes(required);

export const isScope = (s: string): s is Scope => (SCOPES as readonly string[]).includes(s);
