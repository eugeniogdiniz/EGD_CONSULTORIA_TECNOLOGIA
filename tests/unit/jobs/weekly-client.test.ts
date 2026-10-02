import { describe, it, expect } from "vitest";
import { buildClientDigest, type ClientDigestInput } from "@/modules/jobs/digests/weekly-client";
import { previousMonday } from "@/modules/jobs/digests/weekly-team";

const today = "2026-10-05"; // segunda

describe("andamento semanal do cliente", () => {
  it("semana anterior para concluído, semana corrente para previsto; só o que recebeu (visível)", () => {
    const input: ClientDigestInput = {
      organizationName: "Org",
      projects: [
        {
          id: "p1",
          title: "Portal",
          deliverables: [
            { title: "Feita semana passada", status: "done", dueAt: null, completedAt: new Date("2026-10-01T15:00:00Z") },
            { title: "Feita há muito", status: "done", dueAt: null, completedAt: new Date("2026-09-01T15:00:00Z") },
            { title: "Vence esta semana", status: "doing", dueAt: "2026-10-09", completedAt: null },
            { title: "Vence depois", status: "todo", dueAt: "2026-10-20", completedAt: null },
          ],
          milestones: [
            { name: "Aceite", dueAt: "2026-10-07", completedAt: null },
            { name: "Kickoff", dueAt: "2026-09-30", completedAt: new Date("2026-09-30T12:00:00Z") },
          ],
        },
        { id: "p2", title: "Parado", deliverables: [], milestones: [] },
      ],
      requests: [
        { id: "r1", title: "Aguardando cliente", status: "in_progress", lastAuthor: "team" },
        { id: "r2", title: "Aguardando equipe", status: "open", lastAuthor: "client" },
      ],
    };
    const d = buildClientDigest(input, today);
    expect(d.prevStart).toBe("2026-09-28");
    expect(d.thisEnd).toBe("2026-10-11");
    expect(d.isEmpty).toBe(false);
    const p = d.projects.find((x) => x.id === "p1")!;
    expect(p.percent).toBe(50);
    expect(p.done.map((i) => i.title)).toEqual(["Kickoff", "Feita semana passada"]);
    expect(p.due.map((i) => `${i.kind}:${i.title}`)).toEqual(["milestone:Aceite", "deliverable:Vence esta semana"]);
    expect(d.awaiting.map((r) => r.title)).toEqual(["Aguardando cliente"]);
    expect(d.subject).toBe("Andamento dos seus projetos · semana de 05/10");
    // o tipo de saída não tem custo, prioridade nem responsável
    expect(JSON.stringify(d)).not.toMatch(/cents|priority|assignee/);
  });

  it("sem movimento: não envia", () => {
    const d = buildClientDigest({ organizationName: "Org", projects: [{ id: "p", title: "P", deliverables: [{ title: "x", status: "todo", dueAt: "2026-12-01", completedAt: null }], milestones: [] }], requests: [] }, today);
    expect(d.isEmpty).toBe(true);
    expect(d.projects[0].percent).toBe(0);
  });

  it("segunda anterior", () => {
    expect(previousMonday("2026-10-05")).toBe("2026-09-28");
    expect(previousMonday("2026-10-02")).toBe("2026-09-21");
  });
});
