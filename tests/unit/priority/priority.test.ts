import { describe, it, expect } from "vitest";
import { PRIORITY_LABEL, PRIORITIES, priorityRank, isPriority, compareBacklog, isOverdue } from "@/modules/projects/priority";

describe("rótulos e guarda", () => {
  it("quatro níveis, do mais urgente ao menos", () => {
    expect(PRIORITIES).toEqual(["urgent", "high", "medium", "low"]);
    expect(PRIORITY_LABEL).toEqual({ urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" });
  });
  it("rank cresce da urgente para a baixa", () => {
    expect(PRIORITIES.map(priorityRank)).toEqual([0, 1, 2, 3]);
  });
  it("isPriority recusa valor desconhecido", () => {
    expect(isPriority("high")).toBe(true);
    expect(isPriority("critical")).toBe(false);
  });
});

describe("isOverdue", () => {
  it("atrasada: prazo anterior a hoje e não concluída", () => {
    expect(isOverdue({ dueAt: "2026-10-01", status: "doing" }, "2026-10-02")).toBe(true);
  });
  it("hoje não é atraso; sem prazo não é atraso; concluída nunca é atraso", () => {
    expect(isOverdue({ dueAt: "2026-10-02", status: "todo" }, "2026-10-02")).toBe(false);
    expect(isOverdue({ dueAt: null, status: "todo" }, "2026-10-02")).toBe(false);
    expect(isOverdue({ dueAt: "2026-01-01", status: "done" }, "2026-10-02")).toBe(false);
  });
});

describe("compareBacklog", () => {
  const item = (id: string, priority: "urgent" | "high" | "medium" | "low", dueAt: string | null, createdAt = "2026-09-01") => ({ id, priority, dueAt, createdAt: new Date(createdAt) });
  const order = (xs: ReturnType<typeof item>[]) => [...xs].sort(compareBacklog).map((x) => x.id);

  it("prioridade vence o prazo: uma urgente sem prazo fica antes de uma baixa vencendo amanhã", () => {
    expect(order([item("baixa", "low", "2026-10-01"), item("urgente", "urgent", null)])).toEqual(["urgente", "baixa"]);
  });
  it("na mesma prioridade, o prazo mais próximo vem primeiro e sem prazo vem por último", () => {
    expect(order([item("sem", "high", null), item("tarde", "high", "2026-12-01"), item("cedo", "high", "2026-10-01")])).toEqual(["cedo", "tarde", "sem"]);
  });
  it("empate total: a mais antiga vem primeiro (estável e previsível)", () => {
    expect(order([item("nova", "medium", null, "2026-09-10"), item("velha", "medium", null, "2026-09-01")])).toEqual(["velha", "nova"]);
  });
  it("não muda a lista original", () => {
    const xs = [item("b", "low", null), item("a", "urgent", null)];
    xs.slice().sort(compareBacklog);
    expect(xs.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
