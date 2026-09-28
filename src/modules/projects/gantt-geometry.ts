/**
 * Geometria pura pro Gantt SVG.
 *
 * O caller decide fases e entregas, uma lane por item (Y), e passa a
 * janela visível `[from, to]`. A função devolve x/y/width/height de cada
 * barra + caminhos de dependência. UI só desenha SVG.
 */

export type GanttScale = "day" | "week" | "month";

export type GanttItem = {
  id: string;
  laneIndex: number;
  kind: "phase" | "deliverable";
  start: Date | null;
  end: Date | null;
};

export type GanttEdge = { predecessorId: string; successorId: string };

export type GanttGeometryInput = {
  items: readonly GanttItem[];
  edges: readonly GanttEdge[];
  from: Date;
  to: Date;
  scale: GanttScale;
  today: Date | null;
  laneHeight?: number;
  phaseBarHeight?: number;
  deliverableBarHeight?: number;
};

export type GanttBar = {
  id: string;
  laneIndex: number;
  kind: "phase" | "deliverable";
  x: number;
  y: number;
  width: number;
  height: number;
  hasBar: boolean;
};

export type GanttDependencyPath = {
  predecessorId: string;
  successorId: string;
  d: string;
};

export type GanttGeometryOutput = {
  width: number;
  height: number;
  todayX: number | null;
  bars: GanttBar[];
  dependencyPaths: GanttDependencyPath[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function pxPerDayFor(scale: GanttScale): number {
  switch (scale) {
    case "day":
      return 24;
    case "week":
      return 8;
    case "month":
      return 2;
  }
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

export function buildGanttGeometry(input: GanttGeometryInput): GanttGeometryOutput {
  const {
    items,
    edges,
    from,
    to,
    scale,
    today,
    laneHeight = 32,
    phaseBarHeight = 22,
    deliverableBarHeight = 12,
  } = input;

  const pxPerDay = pxPerDayFor(scale);
  const totalDays = Math.max(0, daysBetween(from, to));
  const width = Math.round(totalDays * pxPerDay);

  const maxLane = items.reduce((acc, i) => Math.max(acc, i.laneIndex), -1);
  const height = Math.max(1, maxLane + 1) * laneHeight;

  const bars: GanttBar[] = items.map((item) => {
    const barHeight = item.kind === "phase" ? phaseBarHeight : deliverableBarHeight;
    const y = item.laneIndex * laneHeight + (laneHeight - barHeight) / 2;

    if (!item.start || !item.end || item.end < item.start) {
      return {
        id: item.id,
        laneIndex: item.laneIndex,
        kind: item.kind,
        x: 0,
        y,
        width: 0,
        height: barHeight,
        hasBar: false,
      };
    }

    const clampedStart = item.start < from ? from : item.start > to ? to : item.start;
    const clampedEnd = item.end > to ? to : item.end < from ? from : item.end;
    const overlapping = clampedEnd > clampedStart;

    const x = Math.round(daysBetween(from, clampedStart) * pxPerDay);
    const w = Math.round(daysBetween(clampedStart, clampedEnd) * pxPerDay);

    return {
      id: item.id,
      laneIndex: item.laneIndex,
      kind: item.kind,
      x,
      y,
      width: overlapping ? w : 0,
      height: barHeight,
      hasBar: overlapping,
    };
  });

  const barById = new Map(bars.map((b) => [b.id, b]));
  const dependencyPaths: GanttDependencyPath[] = [];
  for (const edge of edges) {
    const p = barById.get(edge.predecessorId);
    const s = barById.get(edge.successorId);
    if (!p || !s || !p.hasBar || !s.hasBar) continue;
    const fromX = p.x + p.width;
    const fromY = p.y + p.height / 2;
    const toX = s.x;
    const toY = s.y + s.height / 2;
    const midX = fromX + Math.max(8, (toX - fromX) / 2);
    dependencyPaths.push({
      predecessorId: edge.predecessorId,
      successorId: edge.successorId,
      d: `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`,
    });
  }

  let todayX: number | null = null;
  if (today && today >= from && today <= to) {
    todayX = Math.round(daysBetween(from, today) * pxPerDay);
  }

  return { width, height, todayX, bars, dependencyPaths };
}
