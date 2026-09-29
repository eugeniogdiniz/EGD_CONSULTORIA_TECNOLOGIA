/** Prioridade de trabalho (entregas e solicitações). Regras puras, sem banco. */

export const PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

/** Cores do selo (as mesmas classes de tema usadas nos demais selos). */
export const PRIORITY_STYLE: Record<Priority, string> = {
  urgent: "border-danger bg-danger-soft text-danger",
  high: "border-warning bg-warning-soft text-warning",
  medium: "border-link bg-link-soft text-link",
  low: "border-border bg-paper text-muted-foreground",
};

export const isPriority = (v: string): v is Priority => (PRIORITIES as readonly string[]).includes(v);

/** 0 = mais urgente. */
export const priorityRank = (p: Priority): number => PRIORITIES.indexOf(p);

/** Atrasada = tem prazo anterior a hoje e ainda não foi concluída. `today` e `dueAt` em 'YYYY-MM-DD'. */
export function isOverdue(d: { dueAt: string | null; status: string }, today: string): boolean {
  return d.dueAt !== null && d.status !== "done" && d.dueAt < today;
}

type Sortable = { priority: Priority; dueAt: string | null; createdAt: Date };

/**
 * Ordem do backlog: prioridade, depois prazo mais próximo (sem prazo por último),
 * depois a mais antiga. A prioridade vence o prazo: o dono decide o que importa mais,
 * o prazo só desempata dentro do mesmo nível.
 */
export function compareBacklog(a: Sortable, b: Sortable): number {
  const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
  if (byPriority !== 0) return byPriority;
  const ad = a.dueAt ?? "9999-12-31";
  const bd = b.dueAt ?? "9999-12-31";
  if (ad !== bd) return ad < bd ? -1 : 1;
  return a.createdAt.getTime() - b.createdAt.getTime();
}
