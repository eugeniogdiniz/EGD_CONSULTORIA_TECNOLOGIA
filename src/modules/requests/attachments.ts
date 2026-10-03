/** Regras puras dos anexos de solicitação. */
export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "png", "jpg", "jpeg", "gif", "webp", "zip"] as const;

export type AttachmentCandidate = { name: string; size: number };

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Devolve a mensagem de erro, ou null quando a lista é aceitável. Lista vazia é aceitável. */
export function validateAttachments(files: AttachmentCandidate[]): string | null {
  const real = files.filter((f) => f.size > 0 || f.name);
  if (real.length > MAX_FILES) return `No máximo ${MAX_FILES} arquivos por mensagem.`;
  const total = real.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return "Os anexos passam de 50 MB no total.";
  for (const f of real) {
    if (f.size === 0) return `O arquivo "${f.name}" está vazio.`;
    const ext = extensionOf(f.name);
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) return `Tipo de arquivo não permitido: "${f.name}". Aceitos: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

/** Só `File` reais e não vazios do campo múltiplo de um FormData. */
export function filesFrom(fd: FormData, field = "files"): File[] {
  return fd.getAll(field).filter((v): v is File => v instanceof File && (v.size > 0 || v.name !== ""));
}
