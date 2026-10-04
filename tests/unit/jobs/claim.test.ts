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
  it("erro: próxima tentativa só depois do backoff (5 min, depois 15), até a terceira", () => {
    // 1ª falha há 2 min: ainda dentro dos 5 min de espera
    expect(decideClaim([{ status: "error", attempt: 1, startedAt: ago(2) }], now)).toBeNull();
    expect(decideClaim([{ status: "error", attempt: 1, startedAt: ago(5) }], now)).toEqual({ attempt: 2 });
    // 2ª falha há 10 min: espera 15
    expect(
      decideClaim(
        [
          { status: "error", attempt: 1, startedAt: ago(30) },
          { status: "error", attempt: 2, startedAt: ago(10) },
        ],
        now,
      ),
    ).toBeNull();
    expect(
      decideClaim(
        [
          { status: "error", attempt: 1, startedAt: ago(30) },
          { status: "error", attempt: 2, startedAt: ago(15) },
        ],
        now,
      ),
    ).toEqual({ attempt: 3 });
    expect(
      decideClaim(
        [
          { status: "error", attempt: 1, startedAt: ago(60) },
          { status: "error", attempt: 2, startedAt: ago(40) },
          { status: "error", attempt: 3, startedAt: ago(20) },
        ],
        now,
      ),
    ).toBeNull();
    // sem backoff (opção) mantém o comportamento antigo
    expect(decideClaim([{ status: "error", attempt: 1, startedAt: ago(1) }], now, { backoffMinutes: [0, 0] })).toEqual({ attempt: 2 });
  });
  it("em execução recente: espera; presa há mais de 15 min: tenta de novo", () => {
    expect(decideClaim([{ status: "running", attempt: 1, startedAt: ago(5) }], now)).toBeNull();
    expect(decideClaim([{ status: "running", attempt: 1, startedAt: ago(20) }], now)).toEqual({ attempt: 2 });
  });
});
