import { describe, it, expect } from "vitest";
import { issuedAt, meetingSummary } from "@/modules/reports/components/report-bits";

describe("resumo da ata no relatório", () => {
  it("junta as linhas sem pontuação dupla e tira marcadores", () => {
    const at = new Date("2026-09-24T13:00:00Z");
    expect(meetingSummary({ heldAt: at, decisions: "Priorizar o failover do link.\n- Cliente libera acesso ao firewall" }).decisions)
      .toBe("Priorizar o failover do link. Cliente libera acesso ao firewall");
    expect(meetingSummary({ heldAt: at, decisions: "Escopo fechado\nReuniões às terças" }).decisions).toBe("Escopo fechado; Reuniões às terças");
    expect(meetingSummary({ heldAt: at, decisions: null })).toEqual({ date: "24/09/2026", decisions: "—" });
  });
  it("corta decisões longas", () => {
    const r = meetingSummary({ heldAt: new Date(), decisions: "a".repeat(300) });
    expect(r.decisions).toHaveLength(178);
    expect(r.decisions.endsWith("…")).toBe(true);
  });
  it("emissão no fuso de Brasília", () => {
    expect(issuedAt(new Date("2026-10-05T02:30:00Z"))).toBe("04/10/2026 23:30");
  });
});
