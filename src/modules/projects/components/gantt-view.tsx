import Link from "next/link";
import {
  buildGanttGeometry,
  type GanttItem,
  type GanttScale,
} from "@/modules/projects/gantt-geometry";
import { formatIsoDate } from "@/lib/format";
import { cn } from "cn";

const SCALE_LABEL: Record<GanttScale, string> = { day: "Dia", week: "Semana", month: "Mês" };

/** 'YYYY-MM-DD' → Date UTC. Ignora hora pra alinhar barras aos dias inteiros. */
function parseIsoDate(v: string | null): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isoToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function fmtDayMonth(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

const MONTH_LABELS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

const STATUS_FILL: Record<string, string> = {
  todo: "color-mix(in srgb, var(--tinta-400) 22%, var(--folha))",
  doing: "var(--projeto-100)",
  review: "var(--folha)",
  done: "var(--aprovado-100)",
  blocked: "var(--erro-100)",
};

const STATUS_STROKE: Record<string, string> = {
  todo: "var(--regua-500)",
  doing: "var(--projeto-600)",
  review: "var(--projeto-600)",
  done: "var(--aprovado-600)",
  blocked: "var(--erro-600)",
};

const STATUS_DOT: Record<string, string> = {
  todo: "bg-faint",
  doing: "bg-link",
  review: "bg-accent",
  done: "bg-success",
  blocked: "bg-danger",
};

export type GanttDeliverable = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  phaseId: string | null;
};

export function GanttView({
  baseHref,
  deliverableHref,
  scale,
  scales,
  phases,
  deliverables,
  edges,
  clientView = false,
}: {
  baseHref: string;
  deliverableHref: (deliverableId: string) => string;
  scale: GanttScale;
  scales: GanttScale[];
  phases: { id: string; name: string; startedAt: string | null; endedAt: string | null }[];
  deliverables: GanttDeliverable[];
  edges: { predecessorId: string; successorId: string }[];
  /** Visão do cliente: "Bloqueada" vira "Em espera" (tom de aviso). */
  clientView?: boolean;
}) {
  const fillOf = (st: string) => (clientView && st === "blocked" ? "var(--atencao-100)" : STATUS_FILL[st]);
  const strokeOf = (st: string) => (clientView && st === "blocked" ? "var(--atencao-600)" : STATUS_STROKE[st]);
  const dotOf = (st: string) => (clientView && st === "blocked" ? "bg-warning" : STATUS_DOT[st]);
  type GroupPhase = { id: string; name: string; startedAt: string | null; endedAt: string | null };
  const noPhaseGroup = deliverables.filter((d) => !d.phaseId);
  const groups: Array<{ phase: GroupPhase; deliverables: GanttDeliverable[] }> = phases.map((phase) => ({
    phase: { id: phase.id, name: phase.name, startedAt: phase.startedAt, endedAt: phase.endedAt },
    deliverables: deliverables.filter((d) => d.phaseId === phase.id),
  }));
  if (noPhaseGroup.length > 0) {
    groups.push({
      phase: { id: "__no_phase__", name: "Sem fase", startedAt: null, endedAt: null },
      deliverables: noPhaseGroup,
    });
  }

  const undatedDeliverables = deliverables.filter((d) => !d.dueAt);

  const items: GanttItem[] = [];
  const lateralRows: Array<
    | { kind: "phase"; phaseId: string; name: string; count: number }
    | { kind: "deliverable"; id: string; title: string; status: string; dueAt: string | null }
  > = [];

  let lane = 0;
  for (const group of groups) {
    const phaseStart = parseIsoDate(group.phase.startedAt);
    const phaseEnd = parseIsoDate(group.phase.endedAt);
    items.push({
      id: group.phase.id,
      laneIndex: lane,
      kind: "phase",
      start: phaseStart,
      end: phaseEnd,
    });
    lateralRows.push({
      kind: "phase",
      phaseId: group.phase.id,
      name: group.phase.name,
      count: group.deliverables.length,
    });
    lane += 1;

    for (const d of group.deliverables) {
      if (!d.dueAt) continue;
      const due = parseIsoDate(d.dueAt);
      const start = due ? addDays(due, -1) : null;
      items.push({
        id: d.id,
        laneIndex: lane,
        kind: "deliverable",
        start,
        end: due,
      });
      lateralRows.push({
        kind: "deliverable",
        id: d.id,
        title: d.title,
        status: d.status,
        dueAt: d.dueAt,
      });
      lane += 1;
    }
  }

  const allDates: Date[] = [];
  for (const item of items) {
    if (item.start) allDates.push(item.start);
    if (item.end) allDates.push(item.end);
  }
  const today = isoToday();
  let from: Date;
  let to: Date;
  if (allDates.length === 0) {
    from = addDays(today, -14);
    to = addDays(today, 14);
  } else {
    const min = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())));
    from = addDays(min, -3);
    to = addDays(max, 3);
    if (to.getTime() - from.getTime() < 14 * 86_400_000) {
      to = addDays(from, 14);
    }
  }

  const geometry = buildGanttGeometry({
    items,
    edges: edges.map((e) => ({ predecessorId: e.predecessorId, successorId: e.successorId })),
    from,
    to,
    scale,
    today,
    laneHeight: 32,
    phaseBarHeight: 22,
    deliverableBarHeight: 12,
  });

  const HEADER_HEIGHT = 40;
  const width = Math.max(600, geometry.width);
  const height = HEADER_HEIGHT + geometry.height + 8;

  const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

  const monthBands: Array<{ x: number; w: number; label: string }> = [];
  {
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    while (cursor <= to) {
      const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      const bandStart = cursor < from ? from : cursor;
      const bandEnd = nextMonth > to ? to : nextMonth;
      const x = Math.round(daysBetween(from, bandStart) * (geometry.width / totalDays));
      const w = Math.round(daysBetween(bandStart, bandEnd) * (geometry.width / totalDays));
      if (w > 0) {
        monthBands.push({
          x,
          w,
          label: `${MONTH_LABELS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`,
        });
      }
      cursor = nextMonth;
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-card p-3">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span>Escala</span>
          <div role="group" aria-label="Escala da linha do tempo" className="inline-flex overflow-hidden rounded-sm border border-input">
            {scales.map((s) => (
              <Link
                key={s}
                href={`${baseHref}?scale=${s}`}
                aria-pressed={s === scale}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  s === scale ? "bg-link-soft text-link font-medium" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {SCALE_LABEL[s]}
              </Link>
            ))}
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span>Janela</span>
          <span className="type-data">{fmtDayMonth(from)} → {fmtDayMonth(to)}</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-[2px] border" style={{ background: "var(--projeto-100)", borderColor: "var(--projeto-600)" }} />
            Fase
          </span>
          {(["todo", "doing", "review", "done", "blocked"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-6 rounded-[2px] border"
                style={{ background: fillOf(s), borderColor: strokeOf(s) }}
              />
              {s === "todo" ? "A fazer" : s === "doing" ? "Em progresso" : s === "review" ? "Revisão" : s === "done" ? "Feita" : clientView ? "Em espera" : "Bloqueada"}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[136px_1fr] overflow-hidden rounded-md border border-border bg-card md:grid-cols-[260px_1fr]">
        <div className="border-r border-border">
          <div className="flex h-10 items-center border-b border-border bg-paper px-2 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase md:px-4">
            Item
          </div>
          {lateralRows.map((row) => {
            if (row.kind === "phase") {
              return (
                <div
                  key={`p-${row.phaseId}`}
                  className="flex h-8 items-center gap-2 border-b border-border bg-paper px-2 text-sm font-medium last:border-b-0 md:px-4"
                >
                  <span className="w-3 text-faint">▾</span>
                  <span className="flex-1 truncate">{row.name}</span>
                  <span className="type-micro hidden text-faint md:inline">{row.count} entregas</span>
                </div>
              );
            }
            return (
              <div
                key={`d-${row.id}`}
                className="flex h-8 items-center gap-2 border-b border-border px-2 text-sm last:border-b-0 md:px-4"
              >
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dotOf(row.status))} />
                <Link
                  href={`${deliverableHref(row.id)}`}
                  className="flex-1 truncate hover:text-link"
                >
                  {row.title}
                </Link>
                <span className="type-micro hidden text-faint md:inline">{formatIsoDate(row.dueAt).slice(0, 5)}</span>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Timeline Gantt de ${fmtDayMonth(from)} a ${fmtDayMonth(to)}`}
            className="block"
          >
            <rect x={0} y={0} width={width} height={HEADER_HEIGHT} fill="var(--papel-100)" />
            <line x1={0} y1={HEADER_HEIGHT} x2={width} y2={HEADER_HEIGHT} stroke="var(--border)" />
            {monthBands.map((band) => (
              <g key={`mb-${band.x}`}>
                <text
                  x={band.x + 8}
                  y={16}
                  fontSize={11}
                  fill="var(--tinta-600)"
                  fontWeight={500}
                >
                  {band.label}
                </text>
                {band.x > 0 && (
                  <line x1={band.x} y1={0} x2={band.x} y2={height} stroke="var(--border)" />
                )}
              </g>
            ))}

            <defs>
              <marker id="gantt-arrow" viewBox="0 0 8 8" refX={6} refY={4} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8 z" fill="var(--tinta-600)" />
              </marker>
            </defs>

            <g transform={`translate(0, ${HEADER_HEIGHT})`}>
              {lateralRows.map((row, i) => {
                if (row.kind !== "phase") return null;
                return (
                  <rect
                    key={`bg-${row.phaseId}`}
                    x={0}
                    y={i * 32}
                    width={width}
                    height={32}
                    fill="var(--papel-100)"
                    opacity={0.6}
                  />
                );
              })}

              {geometry.bars.map((bar) => {
                if (!bar.hasBar) return null;
                const isPhase = bar.kind === "phase";
                const row = lateralRows[bar.laneIndex];
                const status = row && row.kind === "deliverable" ? row.status : null;
                const fill = isPhase ? "var(--projeto-100)" : status ? fillOf(status) : "var(--folha)";
                const stroke = isPhase ? "var(--projeto-600)" : status ? strokeOf(status) : "var(--regua-500)";
                return (
                  <g key={bar.id}>
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={Math.max(2, bar.width)}
                      height={bar.height}
                      rx={2}
                      fill={fill}
                      stroke={stroke}
                    />
                    {isPhase && bar.width > 60 && row?.kind === "phase" && (
                      <text
                        x={bar.x + 8}
                        y={bar.y + bar.height / 2 + 4}
                        fontSize={11}
                        fill="var(--projeto-600)"
                        fontWeight={500}
                      >
                        {row.name}
                      </text>
                    )}
                  </g>
                );
              })}

              <g fill="none" stroke="var(--tinta-600)" strokeWidth={1.2}>
                {geometry.dependencyPaths.map((path) => (
                  <path
                    key={`${path.predecessorId}-${path.successorId}`}
                    d={path.d}
                    markerEnd="url(#gantt-arrow)"
                  />
                ))}
              </g>
            </g>

            {geometry.todayX !== null && (
              <g>
                <line
                  x1={geometry.todayX}
                  y1={HEADER_HEIGHT}
                  x2={geometry.todayX}
                  y2={height}
                  stroke="var(--sinal-500)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <rect
                  x={geometry.todayX - 22}
                  y={22}
                  width={44}
                  height={16}
                  rx={2}
                  fill="var(--sinal-500)"
                />
                <text
                  x={geometry.todayX}
                  y={33}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#fff"
                  fontWeight={600}
                >
                  HOJE
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {undatedDeliverables.length > 0 && (
        <div className="rounded-md border border-dashed border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <strong className="text-foreground font-medium">
            {undatedDeliverables.length} entrega{undatedDeliverables.length === 1 ? "" : "s"} sem data
          </strong>{" "}
          — {undatedDeliverables.map((d) => d.title).join(", ")}. Adicione um prazo pra elas aparecerem na timeline.
        </div>
      )}
    </>
  );
}
