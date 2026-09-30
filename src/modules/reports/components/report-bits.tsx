import { cn } from "cn";
import type { MilestoneLine } from "../build";
import { dateInSaoPaulo, formatBr } from "../dates";
import { milestoneText } from "../labels";

const DOT: Record<MilestoneLine["state"], string> = { done: "bg-success", late: "bg-danger", pending: "bg-faint" };

export function MilestoneStatus({ m }: { m: MilestoneLine }) {
  const soon = m.state === "pending" && m.days <= 14;
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", m.state === "late" && "text-danger")}>
      <i aria-hidden className={cn("inline-block size-2 rounded-full", soon ? "bg-link" : DOT[m.state])} />
      {milestoneText(m)}
    </span>
  );
}

const HHMM = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

/** "30/09/2026 14:20" no fuso de Brasília. */
export function issuedAt(now: Date = new Date()): string {
  return `${formatBr(dateInSaoPaulo(now))} ${HHMM.format(now)}`;
}

/** Data da reunião e as decisões numa linha só (a ata completa fica na tela da ata). */
export function meetingSummary(m: { heldAt: Date; decisions: string | null }) {
  const lines = (m.decisions ?? "").split(/\n+/).map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);
  // Linha que já termina em pontuação emenda com espaço; as demais, com "; ".
  const firstLines = lines.reduce((acc, l) => (acc === "" ? l : /[.!?;:]$/.test(acc) ? `${acc} ${l}` : `${acc}; ${l}`), "");
  return {
    date: formatBr(dateInSaoPaulo(m.heldAt)),
    decisions: firstLines === "" ? "—" : firstLines.length > 180 ? `${firstLines.slice(0, 177)}…` : firstLines,
  };
}
