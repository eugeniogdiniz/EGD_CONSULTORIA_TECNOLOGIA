/**
 * Regras puras do que o cliente enxerga. Sem banco: recebe linhas já
 * filtradas por organização e por `visibleToClient`.
 */

export type DeliverableStatus = "todo" | "doing" | "review" | "done" | "blocked";

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  todo: "A fazer",
  doing: "Em progresso",
  review: "Em revisão",
  done: "Concluída",
  blocked: "Em espera",
};

/** "Bloqueada" é interno: o cliente vê "Em espera", nunca o motivo. */
export function portalStatusLabel(status: DeliverableStatus): string {
  return STATUS_LABEL[status];
}

export type PhaseState = "done" | "active" | "upcoming";

export function phaseState(
  counts: { total: number; done: number },
  today: string,
  startedAt?: string | null,
): PhaseState {
  if (counts.total > 0 && counts.done === counts.total) return "done";
  if (counts.done > 0) return "active";
  if (startedAt && startedAt <= today) return "active";
  return "upcoming";
}

export type MilestoneState = "done" | "late" | "pending";

export function milestoneState(
  m: { dueAt: string; completedAt: Date | null },
  today: string,
): MilestoneState {
  if (m.completedAt) return "done";
  return m.dueAt < today ? "late" : "pending";
}

export type ProjectSummary = {
  total: number;
  done: number;
  percent: number;
  nextDeliverableDueAt: string | null;
  nextMilestoneDueAt: string | null;
};

export function summarizeProject(
  deliverables: readonly { status: DeliverableStatus; dueAt: string | null }[],
  milestones: readonly { dueAt: string; completedAt: Date | null }[],
  today: string,
): ProjectSummary {
  const total = deliverables.length;
  const done = deliverables.filter((d) => d.status === "done").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const nextDeliverableDueAt =
    deliverables
      .filter((d) => d.status !== "done" && d.dueAt !== null && d.dueAt >= today)
      .map((d) => d.dueAt as string)
      .sort()[0] ?? null;

  const nextMilestoneDueAt =
    milestones
      .filter((m) => m.completedAt === null)
      .map((m) => m.dueAt)
      .sort()[0] ?? null;

  return { total, done, percent, nextDeliverableDueAt, nextMilestoneDueAt };
}

/**
 * A equipe registra o motivo de bloqueio dentro da descrição
 * ("## Bloqueio"). Isso é interno: corta tudo a partir da primeira ocorrência.
 */
export function stripInternalNotes(description: string | null): string | null {
  if (description === null) return null;
  const idx = description.search(/(^|\n)## Bloqueio\b/);
  const visible = (idx === -1 ? description : description.slice(0, idx)).trim();
  return visible === "" ? null : visible;
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  active: "Em execução",
  on_hold: "Em espera",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

/** Estilo do selo (mesmas classes do admin) por status de projeto ou entrega. */
export const STATUS_STYLE: Record<string, string> = {
  planning: "border-border bg-subtle text-muted-foreground",
  active: "border-link bg-link-soft text-link",
  on_hold: "border-warning bg-warning-soft text-warning",
  delivered: "border-success bg-success-soft text-success",
  cancelled: "border-danger bg-danger-soft text-danger",
  todo: "border-border bg-subtle text-muted-foreground",
  doing: "border-link bg-link-soft text-link",
  review: "border-strong bg-card text-foreground",
  done: "border-success bg-success-soft text-success",
  blocked: "border-warning bg-warning-soft text-warning",
};
