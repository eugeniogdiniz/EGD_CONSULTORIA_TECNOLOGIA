import { describe, it, expect } from "vitest";
import { acceptanceState, canDecide, decisionSchema, proposalVisibleToClient } from "@/modules/portal-proposals/rules";

describe("regras do portal de propostas", () => {
  it("visível só fora do rascunho e com arquivo; decide só em enviada", () => {
    expect(proposalVisibleToClient({ status: "draft", fileId: "f" })).toBe(false);
    expect(proposalVisibleToClient({ status: "sent", fileId: null })).toBe(false);
    expect(proposalVisibleToClient({ status: "sent", fileId: "f" })).toBe(true);
    expect(proposalVisibleToClient({ status: "expired", fileId: "f" })).toBe(true);
    expect(canDecide("sent")).toBe(true);
    expect(canDecide("expired")).toBe(false);
    expect(canDecide("accepted")).toBe(false);
  });
  it("aceite exige nome e confirmação; recusa exige motivo", () => {
    expect(decisionSchema.safeParse({ decision: "accepted", name: "Ana Souza", agree: true }).success).toBe(true);
    expect(decisionSchema.safeParse({ decision: "accepted", name: "An", agree: true }).success).toBe(false);
    expect(decisionSchema.safeParse({ decision: "accepted", name: "Ana Souza", agree: false }).success).toBe(false);
    expect(decisionSchema.safeParse({ decision: "rejected", notes: "Valor acima do orçamento." }).success).toBe(true);
    expect(decisionSchema.safeParse({ decision: "rejected", notes: "não" }).success).toBe(false);
  });
  it("última decisão manda", () => {
    expect(acceptanceState([])).toBeNull();
    expect(acceptanceState([{ decision: "changes_requested" }, { decision: "approved" }])?.decision).toBe("changes_requested");
  });
});
