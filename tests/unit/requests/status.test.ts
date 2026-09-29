import { describe, it, expect } from "vitest";
import { STATUS_LABEL, statusAfterReply, canClientResolve, isRequestStatus } from "@/modules/requests/status";

describe("statusAfterReply", () => {
  it("resposta da equipe em aberta vira em andamento", () => {
    expect(statusAfterReply("open", "team")).toBe("in_progress");
  });
  it("resposta da equipe não muda em andamento nem resolvida", () => {
    expect(statusAfterReply("in_progress", "team")).toBe("in_progress");
    expect(statusAfterReply("resolved", "team")).toBe("resolved");
  });
  it("resposta do cliente reabre uma resolvida", () => {
    expect(statusAfterReply("resolved", "client")).toBe("open");
  });
  it("resposta do cliente não muda aberta nem em andamento", () => {
    expect(statusAfterReply("open", "client")).toBe("open");
    expect(statusAfterReply("in_progress", "client")).toBe("in_progress");
  });
});

describe("canClientResolve", () => {
  it("só enquanto não está resolvida", () => {
    expect(canClientResolve("open")).toBe(true);
    expect(canClientResolve("in_progress")).toBe(true);
    expect(canClientResolve("resolved")).toBe(false);
  });
});

describe("rótulos e guarda", () => {
  it("rotula os três status em português", () => {
    expect(STATUS_LABEL).toEqual({ open: "Aberta", in_progress: "Em andamento", resolved: "Resolvida" });
  });
  it("isRequestStatus recusa valores desconhecidos", () => {
    expect(isRequestStatus("open")).toBe(true);
    expect(isRequestStatus("closed")).toBe(false);
  });
});
