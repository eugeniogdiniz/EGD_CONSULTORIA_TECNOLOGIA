import { describe, it, expect } from "vitest";
import { KINDS, getKind, isKind, kindsFor, pickEmailRecipients, relativeTime, excerpt } from "@/modules/notifications/kinds";
import { retentionCutoffs } from "@/modules/notifications/cleanup";

describe("tipos", () => {
  it("todo tipo tem chave única, rótulo, descrição e público", () => {
    const keys = KINDS.map((k) => k.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of KINDS) {
      expect(k.label.length).toBeGreaterThan(2);
      expect(k.description.length).toBeGreaterThan(5);
      expect(["admin", "client"]).toContain(k.audience);
    }
  });
  it("kindsFor separa os públicos e isKind recusa desconhecido", () => {
    expect(kindsFor("admin").every((k) => k.audience === "admin")).toBe(true);
    expect(kindsFor("client").every((k) => k.audience === "client")).toBe(true);
    expect(kindsFor("admin").length + kindsFor("client").length).toBe(KINDS.length);
    expect(isKind("request.created")).toBe(true);
    expect(isKind("x.y")).toBe(false);
    expect(getKind("proposal.expired").emailable).toBe(false);
  });
});

const ana = { id: "a", email: "a@x.com", name: "Ana" };
const bia = { id: "b", email: "b@x.com", name: "Bia" };

describe("pickEmailRecipients", () => {
  it("sem linha de preferência = ligado", () => {
    expect(pickEmailRecipients([ana, bia], [], "request.created")).toEqual([ana, bia]);
  });
  it("linha false desliga só aquela pessoa e aquele tipo", () => {
    const prefs = [{ userId: "a", kind: "request.created", email: false }, { userId: "b", kind: "comment.client", email: false }];
    expect(pickEmailRecipients([ana, bia], prefs, "request.created")).toEqual([bia]);
    expect(pickEmailRecipients([ana, bia], prefs, "comment.client")).toEqual([ana]);
  });
  it("tipo não e-mailável nunca manda; quem causou o evento sai", () => {
    expect(pickEmailRecipients([ana, bia], [], "proposal.expired")).toEqual([]);
    expect(pickEmailRecipients([ana, bia], [], "request.created", "a")).toEqual([bia]);
  });
});

describe("relativeTime e excerpt", () => {
  const now = new Date("2026-10-03T15:00:00Z");
  it("escala de agora até dias e cai para a data", () => {
    expect(relativeTime(new Date("2026-10-03T14:59:40Z"), now)).toBe("agora");
    expect(relativeTime(new Date("2026-10-03T14:55:00Z"), now)).toBe("há 5 min");
    expect(relativeTime(new Date("2026-10-03T12:00:00Z"), now)).toBe("há 3 h");
    expect(relativeTime(new Date("2026-10-01T15:00:00Z"), now)).toBe("há 2 d");
    expect(relativeTime(new Date("2026-09-01T15:00:00Z"), now)).toBe("01/09/2026");
  });
  it("excerpt trunca com reticências e preserva nulo", () => {
    expect(excerpt(null)).toBeNull();
    expect(excerpt("abc")).toBe("abc");
    expect(excerpt("x".repeat(200), 10)).toBe("xxxxxxxxx…");
  });
});

it("retenção: 90 dias para lidas, 180 para não lidas", () => {
  const c = retentionCutoffs(new Date("2026-10-03T00:00:00Z"));
  expect(c.readBefore.toISOString().slice(0, 10)).toBe("2026-07-05");
  expect(c.unreadBefore.toISOString().slice(0, 10)).toBe("2026-04-06");
});
