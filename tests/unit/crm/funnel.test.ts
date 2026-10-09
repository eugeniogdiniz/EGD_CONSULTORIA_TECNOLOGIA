import { describe, it, expect } from "vitest";
import { splitRecentClosed } from "@/modules/crm/funnel";

const now = new Date("2026-10-09T12:00:00Z");
const d = (iso: string) => new Date(iso);

describe("splitRecentClosed", () => {
  it("ganha hoje e perdida há 10 dias são recentes; há 45 dias é antiga; sem data é antiga", () => {
    const cards = [
      { id: "a", wonAt: d("2026-10-09T01:35:00Z"), lostAt: null },
      { id: "b", wonAt: null, lostAt: d("2026-09-29T00:00:00Z") },
      { id: "c", wonAt: d("2026-08-25T00:00:00Z"), lostAt: null },
      { id: "d", wonAt: null, lostAt: null },
    ];
    const { recent, older } = splitRecentClosed(cards, now);
    expect(recent.map((c) => c.id)).toEqual(["a", "b"]);
    expect(older.map((c) => c.id)).toEqual(["c", "d"]);
  });
  it("janela configurável", () => {
    const cards = [{ id: "x", wonAt: d("2026-10-01T00:00:00Z"), lostAt: null }];
    expect(splitRecentClosed(cards, now, 7).recent).toHaveLength(0);
    expect(splitRecentClosed(cards, now, 10).recent).toHaveLength(1);
  });
});
