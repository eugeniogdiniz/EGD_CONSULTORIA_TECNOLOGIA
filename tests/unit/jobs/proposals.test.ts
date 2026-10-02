import { it, expect } from "vitest";
import { proposalsToExpire } from "@/modules/jobs/digests/proposals";

it("expira só propostas enviadas com validade já passada", () => {
  const rows = [
    { id: "a", status: "sent", validUntil: "2026-10-01" },
    { id: "b", status: "sent", validUntil: "2026-10-02" }, // vence hoje: ainda vale
    { id: "c", status: "sent", validUntil: null },
    { id: "d", status: "draft", validUntil: "2026-09-01" },
    { id: "e", status: "accepted", validUntil: "2026-09-01" },
  ];
  expect(proposalsToExpire(rows, "2026-10-02").map((r) => r.id)).toEqual(["a"]);
  expect(proposalsToExpire(rows, "2026-10-03").map((r) => r.id)).toEqual(["a", "b"]);
});
