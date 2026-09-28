import { describe, it, expect } from "vitest";
import {
  portalStatusLabel,
  phaseState,
  milestoneState,
  summarizeProject,
} from "@/modules/portal-projects/scope";

describe("portalStatusLabel", () => {
  it("traduz blocked para 'Em espera'", () => {
    expect(portalStatusLabel("blocked")).toBe("Em espera");
  });
  it("mantém os demais rótulos", () => {
    expect(portalStatusLabel("todo")).toBe("A fazer");
    expect(portalStatusLabel("doing")).toBe("Em progresso");
    expect(portalStatusLabel("review")).toBe("Em revisão");
    expect(portalStatusLabel("done")).toBe("Concluída");
  });
});

describe("phaseState", () => {
  it("concluída quando todas as entregas visíveis estão feitas", () => {
    expect(phaseState({ total: 3, done: 3 }, "2026-10-01")).toBe("done");
  });
  it("em andamento quando há progresso parcial", () => {
    expect(phaseState({ total: 4, done: 1 }, "2026-10-01")).toBe("active");
  });
  it("a iniciar quando nada foi feito e a fase ainda não começou", () => {
    expect(phaseState({ total: 2, done: 0 }, "2026-10-01", "2026-11-21")).toBe("upcoming");
  });
  it("em andamento quando a data de início já passou mesmo sem entregas feitas", () => {
    expect(phaseState({ total: 2, done: 0 }, "2026-12-01", "2026-11-21")).toBe("active");
  });
  it("sem entregas visíveis, decide pela data", () => {
    expect(phaseState({ total: 0, done: 0 }, "2026-10-01", "2026-11-21")).toBe("upcoming");
  });
});

describe("milestoneState", () => {
  it("done quando completado", () => {
    expect(milestoneState({ dueAt: "2026-10-01", completedAt: new Date() }, "2026-11-01")).toBe("done");
  });
  it("late quando vencido e não concluído", () => {
    expect(milestoneState({ dueAt: "2026-10-14", completedAt: null }, "2026-10-15")).toBe("late");
  });
  it("pending quando vence hoje ou depois", () => {
    expect(milestoneState({ dueAt: "2026-10-15", completedAt: null }, "2026-10-15")).toBe("pending");
  });
});

describe("summarizeProject", () => {
  const dels = [
    { status: "done", dueAt: "2026-10-01" },
    { status: "doing", dueAt: "2026-10-15" },
    { status: "todo", dueAt: null },
    { status: "blocked", dueAt: "2026-10-30" },
    { status: "done", dueAt: null },
  ] as const;
  it("conta total, feitas e percentual", () => {
    const s = summarizeProject(dels, [], "2026-10-10");
    expect(s.total).toBe(5);
    expect(s.done).toBe(2);
    expect(s.percent).toBe(40);
  });
  it("percentual 0 sem entregas", () => {
    expect(summarizeProject([], [], "2026-10-10").percent).toBe(0);
  });
  it("próxima entrega é a aberta de menor prazo a partir de hoje", () => {
    expect(summarizeProject(dels, [], "2026-10-10").nextDeliverableDueAt).toBe("2026-10-15");
  });
  it("próxima entrega nula quando não há prazo futuro", () => {
    expect(summarizeProject(dels, [], "2026-12-01").nextDeliverableDueAt).toBeNull();
  });
  it("próximo marco é o pendente de menor data (atrasados contam)", () => {
    const ms = [
      { dueAt: "2026-10-08", completedAt: new Date() },
      { dueAt: "2026-10-14", completedAt: null },
      { dueAt: "2026-12-12", completedAt: null },
    ];
    expect(summarizeProject([], ms, "2026-10-20").nextMilestoneDueAt).toBe("2026-10-14");
  });
});
