import { describe, it, expect } from "vitest";
import { formatProposalNumber } from "@/modules/crm/proposal-number";

describe("formatProposalNumber", () => {
  it("formata sequência pequena com 3 dígitos", () => {
    expect(formatProposalNumber(2026, 1)).toBe("PROP-26-001");
    expect(formatProposalNumber(2026, 14)).toBe("PROP-26-014");
  });
  it("mantém formato quando sequência passa de 999", () => {
    expect(formatProposalNumber(2026, 1000)).toBe("PROP-26-1000");
    expect(formatProposalNumber(2026, 42_000)).toBe("PROP-26-42000");
  });
  it("virada de ano zera a sequência no formato (o próprio banco cuida do reset real)", () => {
    expect(formatProposalNumber(2027, 1)).toBe("PROP-27-001");
  });
  it("normaliza ano para dois dígitos", () => {
    expect(formatProposalNumber(1999, 5)).toBe("PROP-99-005");
    expect(formatProposalNumber(2100, 5)).toBe("PROP-00-005");
  });
});
