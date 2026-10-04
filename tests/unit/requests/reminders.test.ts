import { describe, it, expect } from "vitest";
import { requestsToRemind, type ReminderCandidate } from "@/modules/requests/reminders";

const sp = (iso: string) => new Date(`${iso}:00-03:00`);
const now = sp("2026-10-09T10:00"); // sexta
const base: ReminderCandidate = {
  id: "1",
  title: "Acesso",
  status: "in_progress",
  organizationId: "o",
  organizationName: "Org",
  reminderCount: 0,
  lastReminderAt: null,
  lastAuthorRole: "admin",
  lastMessageAt: sp("2026-10-01T10:00"), // quinta, 6 dias úteis antes
};

describe("requestsToRemind", () => {
  it("lembra quando a equipe falou por último há 5 dias úteis ou mais", () => {
    expect(requestsToRemind([base], now).map((r) => r.idleBusinessDays)).toEqual([6]);
    expect(requestsToRemind([{ ...base, lastMessageAt: sp("2026-10-02T10:00") }], now)).toHaveLength(1); // exatamente 5
  });
  it("não lembra: menos de 5 dias úteis, cliente falou por último, sem mensagem, resolvida", () => {
    expect(requestsToRemind([{ ...base, lastMessageAt: sp("2026-10-05T10:00") }], now)).toHaveLength(0);
    expect(requestsToRemind([{ ...base, lastAuthorRole: "client" }], now)).toHaveLength(0);
    expect(requestsToRemind([{ ...base, lastAuthorRole: null, lastMessageAt: null }], now)).toHaveLength(0);
    expect(requestsToRemind([{ ...base, status: "resolved" }], now)).toHaveLength(0);
  });
  it("respeita o máximo de 2 e o intervalo de 5 dias úteis entre lembretes", () => {
    expect(requestsToRemind([{ ...base, reminderCount: 2 }], now)).toHaveLength(0);
    expect(requestsToRemind([{ ...base, reminderCount: 1, lastReminderAt: sp("2026-10-07T09:30") }], now)).toHaveLength(0);
    expect(requestsToRemind([{ ...base, reminderCount: 1, lastReminderAt: sp("2026-09-30T09:30") }], now)).toHaveLength(1);
  });
});
