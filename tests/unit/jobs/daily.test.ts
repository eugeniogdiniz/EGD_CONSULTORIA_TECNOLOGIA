import { describe, it, expect } from "vitest";
import { buildDailyDigest, businessDaysBetween, type DailyDigestInput } from "@/modules/jobs/digests/daily";

const today = "2026-10-02"; // sexta
const base: DailyDigestInput = { deliverables: [], milestones: [], requests: [], proposals: [] };
const del = (over: Partial<DailyDigestInput["deliverables"][number]>) => ({
  id: "d",
  title: "Entrega",
  projectId: "p",
  projectTitle: "Projeto",
  priority: "medium" as const,
  status: "todo",
  dueAt: null,
  assigneeName: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  ...over,
});

describe("resumo diário", () => {
  it("vazio: não envia e assunto zera", () => {
    const d = buildDailyDigest(base, today);
    expect(d.isEmpty).toBe(true);
    expect(d.subject).toBe("Resumo de 02/10: 0 atrasadas, 0 vencem hoje");
  });

  it("classifica atrasadas, de hoje e próximos 7 dias; marcos entram com ◆", () => {
    const d = buildDailyDigest(
      {
        ...base,
        deliverables: [
          del({ id: "1", title: "Atrasada", dueAt: "2026-09-28", priority: "low" }),
          del({ id: "2", title: "Urgente atrasada", dueAt: "2026-10-01", priority: "urgent" }),
          del({ id: "3", title: "Hoje", dueAt: "2026-10-02" }),
          del({ id: "4", title: "Semana", dueAt: "2026-10-09" }),
          del({ id: "5", title: "Depois", dueAt: "2026-10-10" }),
          del({ id: "6", title: "Concluída", dueAt: "2026-09-01", status: "done" }),
          del({ id: "7", title: "Sem prazo" }),
        ],
        milestones: [
          { id: "m1", name: "Marco amanhã", projectId: "p", projectTitle: "Projeto", dueAt: "2026-10-03" },
          { id: "m2", name: "Marco atrasado", projectId: "p", projectTitle: "Projeto", dueAt: "2026-09-30" },
        ],
      },
      today,
    );
    expect(d.isEmpty).toBe(false);
    // prioridade primeiro: a urgente vem antes da baixa mesmo com menos atraso
    expect(d.late.items.map((l) => l.title)).toEqual(["Urgente atrasada", "Atrasada", "Marco atrasado"]);
    expect(d.late.items[1].daysLate).toBe(4);
    expect(d.dueToday.items.map((l) => l.title)).toEqual(["Hoje"]);
    expect(d.upcoming.items.map((l) => `${l.kind}:${l.title}`)).toEqual(["milestone:Marco amanhã", "deliverable:Semana"]);
    expect(d.urgentCount).toBe(1);
    expect(d.subject).toBe("Resumo de 02/10: 3 atrasadas, 1 vence hoje");
  });

  it("limita cada seção a 15 linhas e conta o resto", () => {
    const many = Array.from({ length: 20 }, (_, i) => del({ id: String(i), title: `E${i}`, dueAt: "2026-09-01" }));
    const d = buildDailyDigest({ ...base, deliverables: many }, today);
    expect(d.late.items).toHaveLength(15);
    expect(d.late.more).toBe(5);
    expect(d.late.total).toBe(20);
  });

  it("solicitações: só as que esperam a equipe, mais antigas primeiro, em dias úteis", () => {
    const d = buildDailyDigest(
      {
        ...base,
        requests: [
          { id: "a", title: "Cliente falou por último", organizationName: "Org", status: "in_progress", lastAuthor: "client", waitingSince: new Date("2026-09-29T12:00:00Z") }, // terça → 3 dias úteis
          { id: "b", title: "Nova sem resposta", organizationName: "Org", status: "open", lastAuthor: null, waitingSince: new Date("2026-10-01T12:00:00Z") },
          { id: "c", title: "Equipe respondeu", organizationName: "Org", status: "in_progress", lastAuthor: "team", waitingSince: new Date("2026-09-01T12:00:00Z") },
          { id: "d", title: "Resolvida", organizationName: "Org", status: "resolved", lastAuthor: "client", waitingSince: new Date("2026-09-01T12:00:00Z") },
        ],
      },
      today,
    );
    expect(d.requests.items.map((r) => [r.title, r.businessDays])).toEqual([
      ["Cliente falou por último", 3],
      ["Nova sem resposta", 1],
    ]);
    expect(d.subject).toContain("2 solicitações aguardando");
  });

  it("propostas: vencendo em 7 dias e expiradas nos últimos 7", () => {
    const prop = (over: Partial<DailyDigestInput["proposals"][number]>) => ({ id: "x", number: "PROP-26-001", title: "T", companyName: "C", status: "sent", validUntil: null, decidedAt: null, ...over });
    const d = buildDailyDigest(
      {
        ...base,
        proposals: [
          prop({ id: "1", number: "PROP-26-001", validUntil: "2026-10-02" }),
          prop({ id: "2", number: "PROP-26-002", validUntil: "2026-10-09" }),
          prop({ id: "3", number: "PROP-26-003", validUntil: "2026-10-10" }),
          prop({ id: "4", number: "PROP-26-004", status: "expired", decidedAt: new Date("2026-09-30T10:00:00Z") }),
          prop({ id: "5", number: "PROP-26-005", status: "expired", decidedAt: new Date("2026-09-01T10:00:00Z") }),
        ],
      },
      today,
    );
    expect(d.expiring.items.map((p) => [p.number, p.daysLeft])).toEqual([["PROP-26-001", 0], ["PROP-26-002", 7]]);
    expect(d.expired.items.map((p) => p.number)).toEqual(["PROP-26-004"]);
  });

  it("dias úteis não contam fim de semana", () => {
    expect(businessDaysBetween("2026-10-02", "2026-10-05")).toBe(1); // sexta → segunda
    expect(businessDaysBetween("2026-09-28", "2026-10-02")).toBe(4);
    expect(businessDaysBetween("2026-10-02", "2026-10-02")).toBe(0);
  });
});
