import { describe, it, expect } from "vitest";
import { reorderPositions } from "@/modules/projects/reorder";

const list = () => [
  { id: "a", position: 0 },
  { id: "b", position: 1 },
  { id: "c", position: 2 },
];

describe("reorderPositions", () => {
  it("move para cima troca com o anterior e renumera 0..n-1", () => {
    const out = reorderPositions(list(), "b", "up");
    expect(out).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
      { id: "c", position: 2 },
    ]);
  });

  it("move para baixo troca com o próximo e renumera", () => {
    const out = reorderPositions(list(), "a", "down");
    expect(out).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
      { id: "c", position: 2 },
    ]);
  });

  it("mover o primeiro para cima é no-op (renumerado, mesma ordem)", () => {
    const out = reorderPositions(list(), "a", "up");
    expect(out.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("mover o último para baixo é no-op (renumerado, mesma ordem)", () => {
    const out = reorderPositions(list(), "c", "down");
    expect(out.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("id inexistente devolve lista original renumerada", () => {
    const bagunca = [
      { id: "a", position: 5 },
      { id: "b", position: 3 },
      { id: "c", position: 8 },
    ];
    const out = reorderPositions(bagunca, "x", "up");
    expect(out).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
      { id: "c", position: 2 },
    ]);
  });

  it("não muta a lista de entrada", () => {
    const original = list();
    const snapshot = JSON.stringify(original);
    reorderPositions(original, "b", "up");
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
