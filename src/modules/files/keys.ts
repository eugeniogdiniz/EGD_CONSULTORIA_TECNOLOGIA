export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const MAX_KEY_NAME = 120;

/**
 * Converte o nome enviado pelo usuário em um nome seguro para a chave do
 * bucket: sem separadores de caminho, sem acentos, só [a-z0-9-] e uma
 * extensão curta em minúsculas. Nunca devolve string vazia.
 */
export function sanitizeFilename(name: string): string {
  const base = name
    .split(/[\\/]/)
    .filter((p) => p && p !== "." && p !== "..")
    .join("-");
  const dot = base.lastIndexOf(".");
  const hasExt = dot > 0 && dot < base.length - 1;
  const ext = hasExt
    ? base
        .slice(dot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10)
    : "";
  const rawStem = hasExt ? base.slice(0, dot) : base.replace(/^\.+/, "");
  let stem =
    rawStem
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "arquivo";
  const max = MAX_KEY_NAME - (ext ? ext.length + 1 : 0);
  if (stem.length > max) stem = stem.slice(0, max);
  return ext ? `${stem}.${ext}` : stem;
}

/** `org/<organizationId>/<fileId>-<nome>` para arquivos de cliente; `internal/<fileId>-<nome>` para arquivos do admin. */
export function buildBucketKey(p: { organizationId: string | null; fileId: string; filename: string }): string {
  const safe = sanitizeFilename(p.filename);
  return p.organizationId ? `org/${p.organizationId}/${p.fileId}-${safe}` : `internal/${p.fileId}-${safe}`;
}
