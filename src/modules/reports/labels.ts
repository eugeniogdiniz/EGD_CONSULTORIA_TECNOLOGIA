/** Rótulos dos relatórios internos. O portal usa `portalStatusLabel`. */
import type { DeliverableStatus, MilestoneLine } from "./build";

export const ADMIN_STATUS_LABEL: Record<DeliverableStatus, string> = {
  todo: "A fazer",
  doing: "Em progresso",
  review: "Em revisão",
  done: "Concluída",
  blocked: "Bloqueada",
};

/** Ordem da barra empilhada: do concluído ao travado. */
export const STATUS_ORDER: readonly DeliverableStatus[] = ["done", "review", "doing", "todo", "blocked"];

export const PROJECT_STATUS_ADMIN_LABEL: Record<string, string> = {
  planning: "Planejamento",
  active: "Ativo",
  on_hold: "Pausado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

export function milestoneText(m: Pick<MilestoneLine, "state" | "days" | "completedOn">): string {
  if (m.state === "done" && m.completedOn) return `concluído em ${m.completedOn.slice(8, 10)}/${m.completedOn.slice(5, 7)}`;
  if (m.state === "late") return `atrasado ${dias(m.days)}`;
  if (m.days === 0) return "hoje";
  if (m.days === 1) return "amanhã";
  return `em ${dias(m.days)}`;
}
