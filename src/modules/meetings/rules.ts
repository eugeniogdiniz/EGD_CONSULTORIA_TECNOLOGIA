/** Regras puras das atas: participantes externos e data/hora local. Sem banco. */

import { isIsoDate } from "@/lib/iso-date";

export type ExternalParticipant = { name: string; organization: string | null };

/**
 * Participantes externos vêm de uma caixa de texto, um por linha:
 * "Nome — Empresa", "Nome - Empresa", "Nome (Empresa)" ou só "Nome".
 * Linhas vazias e repetidas (mesmo nome e empresa) são ignoradas.
 */
export function parseExternalParticipants(text: string): ExternalParticipant[] {
  const seen = new Set<string>();
  const out: ExternalParticipant[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") continue;
    let name = line;
    let organization: string | null = null;
    const paren = /^(.+?)\s*\((.+)\)$/.exec(line);
    const dash = /^(.+?)\s+[—–-]\s+(.+)$/.exec(line);
    if (paren) [, name, organization] = paren;
    else if (dash) [, name, organization] = dash;
    name = name.trim();
    organization = organization?.trim() || null;
    const key = `${name.toLowerCase()}|${(organization ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, organization });
  }
  return out;
}

/** Volta ao formato da caixa de texto (para editar). */
export function formatExternalParticipants(list: readonly ExternalParticipant[]): string {
  return list.map((p) => (p.organization ? `${p.name} — ${p.organization}` : p.name)).join("\n");
}

// Brasília não tem horário de verão desde 2019: o fuso é fixo em -03:00.
const SAO_PAULO_OFFSET = "-03:00";

/**
 * `<input type="datetime-local">` manda "AAAA-MM-DDTHH:MM" sem fuso. A reunião
 * aconteceu no horário de Brasília, não no do servidor (UTC no container).
 */
export function parseLocalDateTime(v: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/.exec(v.trim());
  if (!m || !isIsoDate(m[1])) return null;
  const d = new Date(`${m[1]}T${m[2]}${m[3] ?? ":00"}${SAO_PAULO_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inverso de `parseLocalDateTime`: valor para o `datetime-local`, em Brasília. */
export function toLocalDateTimeInput(d: Date): string {
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
