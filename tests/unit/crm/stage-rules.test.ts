import { describe, it, expect } from "vitest";
import { stageAfterProposal } from "@/modules/crm/stage-rules";

describe("stageAfterProposal (funil puxado pela proposta)", () => {
  it("enviar leva para Proposta só quem ainda está antes", () => {
    expect(stageAfterProposal("new", "sent")).toBe("proposal");
    expect(stageAfterProposal("qualified", "sent")).toBe("proposal");
    expect(stageAfterProposal("meeting", "sent")).toBe("proposal");
    expect(stageAfterProposal("proposal", "sent")).toBeNull();
    expect(stageAfterProposal("won", "sent")).toBeNull();
    expect(stageAfterProposal("lost", "sent")).toBeNull();
  });
  it("aceite leva para Ganho de qualquer estágio (reabre uma perdida)", () => {
    expect(stageAfterProposal("proposal", "accepted")).toBe("won");
    expect(stageAfterProposal("lost", "accepted")).toBe("won");
    expect(stageAfterProposal("won", "accepted")).toBeNull();
  });
  it("recusa leva para Perdido só oportunidade aberta; ganha ou já perdida não mudam", () => {
    expect(stageAfterProposal("proposal", "rejected")).toBe("lost");
    expect(stageAfterProposal("new", "rejected")).toBe("lost");
    expect(stageAfterProposal("won", "rejected")).toBeNull();
    expect(stageAfterProposal("lost", "rejected")).toBeNull();
  });
});
