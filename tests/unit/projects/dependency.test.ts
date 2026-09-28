import { describe, it, expect } from "vitest";
import { detectDependencyCycle } from "@/modules/projects/dependency";

type Edge = { predecessorId: string; successorId: string };
const edge = (predecessorId: string, successorId: string): Edge => ({ predecessorId, successorId });

describe("detectDependencyCycle", () => {
  it("grafo vazio: qualquer aresta é livre de ciclo", () => {
    expect(detectDependencyCycle([], "a", "b")).toBe(false);
  });

  it("A→B existente e tentar B→A fecha ciclo", () => {
    expect(detectDependencyCycle([edge("a", "b")], "b", "a")).toBe(true);
  });

  it("A→B existente e adicionar C→D não fecha ciclo (componentes disjuntos)", () => {
    expect(detectDependencyCycle([edge("a", "b")], "c", "d")).toBe(false);
  });

  it("DAG A→B, B→C e tentar C→A fecha ciclo (indireto)", () => {
    const edges = [edge("a", "b"), edge("b", "c")];
    expect(detectDependencyCycle(edges, "c", "a")).toBe(true);
  });

  it("DAG A→B, B→C e adicionar A→C não fecha ciclo (diamante)", () => {
    const edges = [edge("a", "b"), edge("b", "c")];
    expect(detectDependencyCycle(edges, "a", "c")).toBe(false);
  });

  it("auto-loop (X→X) sempre é ciclo", () => {
    expect(detectDependencyCycle([], "x", "x")).toBe(true);
  });

  it("grafo com ramificação: A→B, A→C, B→D, C→D, tentar D→A fecha", () => {
    const edges = [edge("a", "b"), edge("a", "c"), edge("b", "d"), edge("c", "d")];
    expect(detectDependencyCycle(edges, "d", "a")).toBe(true);
  });

  it("grafo com ramificação e nova aresta lateral não fecha", () => {
    const edges = [edge("a", "b"), edge("a", "c")];
    expect(detectDependencyCycle(edges, "b", "c")).toBe(false);
  });
});
