import Link from "next/link";
import { cn } from "cn";
import { buildMonthGrid, parseYearMonth } from "@/modules/projects/month-grid";

const WEEK_HEADS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const STATUS_CHIP: Record<string, string> = {
  todo: "border-border bg-paper text-muted-foreground",
  doing: "border-link bg-link-soft text-link",
  review: "border-strong bg-card text-foreground",
  done: "border-success bg-success-soft text-success",
  blocked: "border-danger bg-danger-soft text-danger",
};

const STATUS_DOT: Record<string, string> = {
  todo: "bg-faint",
  doing: "bg-link",
  review: "bg-accent",
  done: "bg-success",
  blocked: "bg-danger",
};

function nowYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftYearMonth(ym: string, deltaMonths: number): string {
  const { year, month } = parseYearMonth(ym);
  const total = year * 12 + (month - 1) + deltaMonths;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function safeYearMonth(v: unknown): string {
  if (typeof v === "string") {
    try {
      parseYearMonth(v);
      return v;
    } catch {
      // ignore
    }
  }
  return nowYearMonth();
}

function isoDay(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export type CalendarMilestone = { id: string; name: string; dueAt: string; completedAt: Date | null };
export type CalendarDeliverable = { id: string; title: string; status: string; dueAt: string | null };

export function CalendarView({
  baseHref,
  deliverableHref,
  rawYm,
  milestones,
  deliverables,
  clientView = false,
}: {
  baseHref: string;
  deliverableHref: (deliverableId: string) => string;
  rawYm: unknown;
  milestones: CalendarMilestone[];
  deliverables: CalendarDeliverable[];
  /** Visão do cliente: "Bloqueada" vira "Em espera" (tom de aviso). */
  clientView?: boolean;
}) {
  const chipOf = (st: string) => (clientView && st === "blocked" ? "border-warning bg-warning-soft text-warning" : STATUS_CHIP[st]);
  const dotOf = (st: string) => (clientView && st === "blocked" ? "bg-warning" : STATUS_DOT[st]);
  const ym = safeYearMonth(rawYm);
  const grid = buildMonthGrid(ym);
  const monthLabel = `${MONTH_NAMES[grid.month - 1]} · ${grid.year}`;

  type MilestoneRow = CalendarMilestone;
  type DeliverableRow = CalendarDeliverable;
  const milestonesByDay = new Map<string, MilestoneRow[]>();
  for (const m of milestones) {
    if (!m.dueAt) continue;
    const key = m.dueAt;
    if (!milestonesByDay.has(key)) milestonesByDay.set(key, []);
    milestonesByDay.get(key)!.push(m);
  }
  const deliverablesByDay = new Map<string, DeliverableRow[]>();
  for (const d of deliverables) {
    if (!d.dueAt) continue;
    if (!deliverablesByDay.has(d.dueAt)) deliverablesByDay.set(d.dueAt, []);
    deliverablesByDay.get(d.dueAt)!.push(d);
  }

  const today = nowYearMonth() + "-" + String(new Date().getUTCDate()).padStart(2, "0");
  const prev = shiftYearMonth(ym, -1);
  const next = shiftYearMonth(ym, 1);

  const renderMilestone = (m: MilestoneRow) => (
    <span
      key={`m-${m.id}`}
      title={m.name}
      className={cn(
        "inline-flex items-center gap-1 truncate rounded-sm border border-dashed border-link bg-link-soft px-1.5 py-0.5 text-[0.7rem] text-link",
        m.completedAt && "border-success bg-success-soft text-success",
      )}
    >
      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">◇ {m.name}</span>
    </span>
  );
  const renderDeliverable = (d: DeliverableRow) => (
    <Link
      key={`d-${d.id}`}
      href={deliverableHref(d.id)}
      title={d.title}
      className={cn("inline-flex items-center gap-1 truncate rounded-sm border px-1.5 py-0.5 text-[0.7rem]", chipOf(d.status))}
    >
      <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotOf(d.status))} />
      <span className="truncate">{d.title}</span>
    </Link>
  );

  // dias do mês exibido que têm algo (para a agenda do celular)
  const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const agenda = grid.weeks
    .flat()
    .filter((c) => !c.outside)
    .map((c) => {
      const iso = isoDay(c.date);
      return {
        iso,
        isToday: iso === today,
        label: `${WEEKDAY[c.date.getUTCDay()]}, ${String(c.day).padStart(2, "0")}/${String(grid.month).padStart(2, "0")}`,
        milestones: milestonesByDay.get(iso) ?? [],
        deliverables: deliverablesByDay.get(iso) ?? [],
      };
    })
    .filter((a) => a.milestones.length > 0 || a.deliverables.length > 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
        <Link
          href={`${baseHref}?ym=${prev}`}
          aria-label="Mês anterior"
          className="inline-flex h-8 items-center rounded-sm border border-input px-3 text-sm hover:bg-muted"
        >
          ←
        </Link>
        <h2 className="text-base font-semibold">{monthLabel}</h2>
        <Link
          href={`${baseHref}?ym=${next}`}
          aria-label="Próximo mês"
          className="inline-flex h-8 items-center rounded-sm border border-input px-3 text-sm hover:bg-muted"
        >
          →
        </Link>
        <Link
          href={baseHref}
          className="inline-flex h-8 items-center rounded-sm border border-input px-3 text-sm hover:bg-muted"
        >
          Hoje
        </Link>
        <form className="ml-auto flex items-center gap-2 text-sm text-muted-foreground" action={baseHref}>
          <label htmlFor="ym" className="type-micro">Ir para</label>
          <input
            id="ym"
            name="ym"
            type="month"
            defaultValue={ym}
            className="h-8 rounded-sm border border-input bg-card px-2 text-sm"
          />
          <button type="submit" className="h-8 rounded-sm border border-input px-3 text-sm hover:bg-muted">
            Ir
          </button>
        </form>
      </div>

      {/* celular: agenda em lista (a grade de 7 colunas fica ilegível em 390 px) */}
      <div aria-label={`Agenda de ${monthLabel}`} className="grid gap-2.5 sm:hidden">
        {agenda.length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            Nenhum marco ou entrega com data neste mês.
          </p>
        ) : (
          agenda.map((a) => (
            <section
              key={a.iso}
              className={cn("rounded-md border border-border bg-card p-3", a.isToday && "border-link bg-link-soft/30")}
            >
              <h3 className="type-data flex items-baseline gap-2 text-xs font-medium text-muted-foreground">
                {a.label}
                {a.isToday && <span className="text-link">Hoje</span>}
              </h3>
              <div className="mt-2 grid gap-1.5">
                {a.milestones.map(renderMilestone)}
                {a.deliverables.map(renderDeliverable)}
              </div>
            </section>
          ))
        )}
      </div>

      <div role="grid" aria-label={monthLabel} className="hidden grid-cols-7 overflow-hidden rounded-md border border-border bg-card sm:grid">
        {WEEK_HEADS.map((h) => (
          <div key={h} className="border-b border-r border-border bg-paper px-3 py-2 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase last:border-r-0">
            {h}
          </div>
        ))}
        {grid.weeks.flatMap((week, wi) =>
          week.map((cell, ci) => {
            const iso = isoDay(cell.date);
            const isToday = iso === today;
            const lastCol = ci === 6;
            const lastRow = wi === grid.weeks.length - 1;
            return (
              <div
                key={`${wi}-${ci}`}
                className={cn(
                  "flex min-h-[104px] flex-col gap-1 border-r border-b border-border p-2",
                  lastCol && "border-r-0",
                  lastRow && "border-b-0",
                  cell.outside && "bg-paper",
                  isToday && "bg-link-soft/30",
                )}
              >
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "type-data text-xs font-medium",
                      cell.outside ? "text-faint" : "text-muted-foreground",
                      isToday && "text-link",
                    )}
                  >
                    {cell.day}
                  </span>
                  {isToday && <span className="text-[0.7rem] text-link">Hoje</span>}
                </div>
                {!cell.outside && (
                  <>
                    {(milestonesByDay.get(iso) ?? []).map(renderMilestone)}
                    {(deliverablesByDay.get(iso) ?? []).map(renderDeliverable)}
                  </>
                )}
              </div>
            );
          }),
        )}
      </div>
    </>
  );
}
