/** Pastas que todo projeto ganha ao nascer. Ordem = posição. */
export const DEFAULT_FOLDERS = [
  { systemKey: "proposta", name: "Proposta", visibleToClient: true },
  { systemKey: "contrato", name: "Contrato", visibleToClient: true },
  { systemKey: "administrativo", name: "Administrativo", visibleToClient: false },
  { systemKey: "financeiro", name: "Financeiro", visibleToClient: false },
  { systemKey: "tecnico", name: "Técnico", visibleToClient: false },
  { systemKey: "entregas", name: "Entregas", visibleToClient: true },
] as const;

export type SystemFolderKey = (typeof DEFAULT_FOLDERS)[number]["systemKey"];

/** Linhas prontas para inserir as pastas padrão de um projeto. */
export function defaultFolderRows(projectId: string) {
  return DEFAULT_FOLDERS.map((f, i) => ({
    projectId,
    name: f.name,
    systemKey: f.systemKey,
    position: i,
    visibleToClient: f.visibleToClient,
  }));
}

/** Título padrão de um documento enviado: nome do arquivo sem extensão. */
export function titleFromFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base).trim();
  return (stem || base || "Documento").slice(0, 200);
}
