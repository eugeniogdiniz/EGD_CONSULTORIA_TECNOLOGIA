import { cn } from "cn";
import type { BudgetBand, DeliverableStatus, PhaseProgress } from "../build";
import { formatBrShort } from "../dates";
import { STATUS_ORDER } from "../labels";

/** Progresso por fase numa régua graduada de 10 em 10%. */
export function PhaseRuler({ phases }: { phases: PhaseProgress[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {phases.map((p) => (
        <div key={p.id ?? "sem-fase"} className="report-phase grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 text-sm md:grid-cols-[180px_1fr_110px]">
          <div className="font-medium">
            {p.name}
            {p.startedAt && p.endedAt && (
              <span className="block text-[0.8125rem] font-normal text-faint">
                {formatBrShort(p.startedAt)} – {formatBrShort(p.endedAt)}
              </span>
            )}
          </div>
          <div
            role="img"
            aria-label={`${p.name}: ${p.done} de ${p.total} entregas concluídas`}
            className="relative order-3 col-span-2 h-2.5 border border-strong bg-[repeating-linear-gradient(to_right,transparent_0_calc(10%-1px),var(--color-border)_calc(10%-1px)_10%)] md:order-none md:col-span-1"
          >
            <span className={cn("absolute inset-y-0 left-0", p.total > 0 && p.done === p.total ? "bg-success" : "bg-link")} style={{ width: `${p.percent}%` }} />
          </div>
          <div className="text-right font-mono text-[0.8125rem] text-muted-foreground">
            {p.done}/{p.total} · {p.percent}%
          </div>
        </div>
      ))}
    </div>
  );
}

const STACK_COLOR: Record<DeliverableStatus, string> = {
  done: "bg-success",
  review: "bg-link/70",
  doing: "bg-link",
  todo: "bg-subtle",
  blocked: "bg-danger",
};

/** Barra empilhada com a contagem de entregas por status. */
export function StatusStack({ counts, labels }: { counts: Record<DeliverableStatus, number>; labels: Record<DeliverableStatus, string> }) {
  const total = STATUS_ORDER.reduce((s, k) => s + counts[k], 0);
  const summary = STATUS_ORDER.map((k) => `${labels[k]} ${counts[k]}`).join(", ");
  return (
    <div>
      <div role="img" aria-label={summary} className="flex h-5 border border-strong">
        {total > 0 && STATUS_ORDER.map((k) => (counts[k] > 0 ? <span key={k} className={cn("h-full", STACK_COLOR[k])} style={{ width: `${(counts[k] / total) * 100}%` }} /> : null))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground">
        {STATUS_ORDER.map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <i aria-hidden className={cn("inline-block size-2.5 border border-strong", STACK_COLOR[k])} />
            {labels[k]} {counts[k]}
          </li>
        ))}
      </ul>
    </div>
  );
}

const BAND_COLOR: Record<BudgetBand, string> = { ok: "bg-link", warn: "bg-warning", alert: "bg-danger" };

export function MiniBar({ percent, band, label }: { percent: number; band?: BudgetBand | null; label: string }) {
  return (
    <span role="img" aria-label={label} className="relative mr-2 inline-block h-1.5 w-[90px] border border-border bg-subtle align-middle">
      <span className={cn("absolute inset-y-0 left-0", BAND_COLOR[band ?? "ok"])} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </span>
  );
}

export const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

export function LateTag({ days }: { days: number }) {
  return <span className="font-mono text-[0.8125rem] whitespace-nowrap text-danger">{dias(days)} de atraso</span>;
}
