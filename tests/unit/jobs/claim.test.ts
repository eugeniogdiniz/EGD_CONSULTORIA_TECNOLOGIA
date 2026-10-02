import { describe, it, expect } from "vitest";
import { decideClaim } from "@/modules/jobs/claim";

const now = new Date("2026-10-02T11:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);

describe("decisão de tentativa", () => {
  it("sem execução: primeira tentativa", () => {
    expect(decideClaim([], now)).toEqual({ attempt: 1 });
  });
  it("já concluída: nada", () => {
    expect(decideClaim([{ status: "ok", attempt: 1, startedAt: ago(5) }], now)).toBeNull();
  });
  it("erro: próxima tentativa, até a terceira", () => {
    expect(decideClaim([{ status: "error", attempt: 1, startedAt: ago(2) }], now)).toEqual({ attempt: 2 });
    expect(
      decideClaim(
        [
          { status: "error", attempt: 1, startedAt: ago(3) },
          { status: "error", attempt: 2, startedAt: ago(2) },
        ],
        now,
      ),
    ).toEqual({ attempt: 3 });
    expect(
      decideClaim(
        [
          { status: "error", attempt: 1, startedAt: ago(3) },
          { status: "error", attempt: 2, startedAt: ago(2) },
          { status: "error", attempt: 3, startedAt: ago(1) },
        ],
        now,
      ),
    ).toBeNull();
  });
  it("em execução recente: espera; presa há mais de 15 min: tenta de novo", () => {
    expect(decideClaim([{ status: "running", attempt: 1, startedAt: ago(5) }], now)).toBeNull();
    expect(decideClaim([{ status: "running", attempt: 1, startedAt: ago(20) }], now)).toEqual({ attempt: 2 });
  });
});
