import { describe, it, expect } from "vitest";
import {
  buildGanttGeometry,
  pxPerDayFor,
  type GanttItem,
} from "@/modules/projects/gantt-geometry";

const d = (iso: string) => new Date(iso + "T00:00:00Z");

const phase = (
  id: string,
  laneIndex: number,
  start: string | null,
  end: string | null,
): GanttItem => ({
  id,
  laneIndex,
  kind: "phase",
  start: start ? d(start) : null,
  end: end ? d(end) : null,
});

const deliverable = (
  id: string,
  laneIndex: number,
  start: string | null,
  end: string | null,
): GanttItem => ({
  id,
  laneIndex,
  kind: "deliverable",
  start: start ? d(start) : null,
  end: end ? d(end) : null,
});

describe("pxPerDayFor", () => {
  it("day = 24, week = 8, month = 2", () => {
    expect(pxPerDayFor("day")).toBe(24);
    expect(pxPerDayFor("week")).toBe(8);
    expect(pxPerDayFor("month")).toBe(2);
  });
});

describe("buildGanttGeometry", () => {
  const from = d("2026-10-01");
  const to = d("2026-10-15"); // 14 dias inclusive

  it("largura total = dias(to-from) * pxPerDay", () => {
    const out = buildGanttGeometry({
      items: [],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    expect(out.width).toBe(14 * 24);
  });

  it("altura total = numLanes * laneHeight (mínimo 1)", () => {
    const out = buildGanttGeometry({
      items: [phase("p1", 0, "2026-10-02", "2026-10-05"), deliverable("d1", 2, "2026-10-03", "2026-10-06")],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    expect(out.height).toBe(3 * 32); // maior laneIndex + 1 = 3
  });

  it("item alinhado ao from vira x=0", () => {
    const out = buildGanttGeometry({
      items: [phase("p1", 0, "2026-10-01", "2026-10-08")],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    const bar = out.bars.find((b) => b.id === "p1")!;
    expect(bar.x).toBe(0);
    expect(bar.width).toBe(7 * 24);
    expect(bar.hasBar).toBe(true);
  });

  it("item começa 2 dias após from vira x=2*px", () => {
    const out = buildGanttGeometry({
      items: [deliverable("d1", 0, "2026-10-03", "2026-10-05")],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    const bar = out.bars[0];
    expect(bar.x).toBe(2 * 24);
    expect(bar.width).toBe(2 * 24);
  });

  it("item que começa antes do from é clampado a x=0", () => {
    const out = buildGanttGeometry({
      items: [phase("p1", 0, "2026-09-25", "2026-10-05")],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    const bar = out.bars[0];
    expect(bar.x).toBe(0);
    expect(bar.width).toBe(4 * 24); // do from até 10-05
  });

  it("item que termina depois do to é clampado no fim", () => {
    const out = buildGanttGeometry({
      items: [phase("p1", 0, "2026-10-10", "2026-10-30")],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    const bar = out.bars[0];
    expect(bar.x).toBe(9 * 24);
    expect(bar.x + bar.width).toBe(14 * 24);
  });

  it("item totalmente fora do range: hasBar=false", () => {
    const out = buildGanttGeometry({
      items: [phase("p1", 0, "2026-11-01", "2026-11-10")],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    expect(out.bars[0].hasBar).toBe(false);
    expect(out.bars[0].width).toBe(0);
  });

  it("item sem datas (null start ou end): hasBar=false", () => {
    const out = buildGanttGeometry({
      items: [deliverable("d1", 0, null, null), deliverable("d2", 1, "2026-10-02", null)],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    expect(out.bars[0].hasBar).toBe(false);
    expect(out.bars[1].hasBar).toBe(false);
  });

  it("todayX null quando today fora do range", () => {
    const out = buildGanttGeometry({
      items: [],
      edges: [],
      from,
      to,
      scale: "day",
      today: d("2026-09-01"),
    });
    expect(out.todayX).toBeNull();
  });

  it("todayX = dias(today-from) * px quando dentro do range", () => {
    const out = buildGanttGeometry({
      items: [],
      edges: [],
      from,
      to,
      scale: "day",
      today: d("2026-10-05"),
    });
    expect(out.todayX).toBe(4 * 24);
  });

  it("dependency path só emitido quando ambos bares visíveis", () => {
    const out = buildGanttGeometry({
      items: [
        deliverable("a", 0, "2026-10-02", "2026-10-04"),
        deliverable("b", 1, "2026-10-05", "2026-10-08"),
        deliverable("c", 2, "2026-11-01", "2026-11-05"), // fora
      ],
      edges: [
        { predecessorId: "a", successorId: "b" },
        { predecessorId: "b", successorId: "c" },
      ],
      from,
      to,
      scale: "day",
      today: null,
    });
    expect(out.dependencyPaths).toHaveLength(1);
    expect(out.dependencyPaths[0].predecessorId).toBe("a");
    expect(out.dependencyPaths[0].successorId).toBe("b");
    expect(out.dependencyPaths[0].d).toMatch(/^M /);
  });

  it("fase e entrega usam alturas de barra distintas", () => {
    const out = buildGanttGeometry({
      items: [phase("p1", 0, "2026-10-02", "2026-10-05"), deliverable("d1", 1, "2026-10-02", "2026-10-05")],
      edges: [],
      from,
      to,
      scale: "day",
      today: null,
    });
    const p = out.bars.find((b) => b.id === "p1")!;
    const dev = out.bars.find((b) => b.id === "d1")!;
    expect(p.height).toBeGreaterThan(dev.height);
  });
});
