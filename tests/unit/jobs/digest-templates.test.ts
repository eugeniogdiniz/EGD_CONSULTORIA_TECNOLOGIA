import { it, expect } from "vitest";
import { buildDailyDigest } from "@/modules/jobs/digests/daily";
import { buildClientDigest } from "@/modules/jobs/digests/weekly-client";
import { buildWeekly } from "@/modules/reports/build";
import { renderDailyDigest, renderWeeklyClient, renderWeeklyTeam } from "@/modules/mail/digests";

const base = "https://egdsystem.com.br";

it("resumo diário escapa títulos e lista as seções preenchidas", () => {
  const d = buildDailyDigest(
    {
      deliverables: [{ id: "1", title: "<b>Laudo</b>", projectId: "p", projectTitle: "Proj & Cia", priority: "urgent", status: "todo", dueAt: "2026-09-30", assigneeName: "Eugênio", createdAt: new Date() }],
      milestones: [],
      requests: [{ id: "r", title: "Acesso", organizationName: "Org", status: "open", lastAuthor: null, waitingSince: new Date("2026-09-29T12:00:00Z") }],
      proposals: [],
    },
    "2026-10-02",
  );
  const m = renderDailyDigest(d, base);
  expect(m.subject).toBe("Resumo de 02/10: 1 atrasada, 0 vencem hoje, 1 solicitação aguardando");
  expect(m.html).toContain("&lt;b&gt;Laudo&lt;/b&gt;");
  expect(m.html).not.toContain("<b>Laudo</b>");
  expect(m.html).toContain("Proj &amp; Cia");
  expect(m.html).toContain("Atrasadas (1)");
  expect(m.html).not.toContain("Vencem hoje");
  expect(m.html).toContain(`${base}/admin/solicitacoes/r`);
  expect(m.text).toContain("2 dias de atraso");
  expect(m.text).toContain("há 3 dias úteis");
});

it("semanal da equipe sempre tem corpo, mesmo vazio, e aponta para a semana", () => {
  const r = buildWeekly([], "2026-09-28", "2026-10-05");
  const m = renderWeeklyTeam(r, base);
  expect(m.subject).toBe("Semana 2026-S40: 0 concluídos, 0 vencem, 0 atrasados");
  expect(m.text).toContain("Nenhuma entrega ou marco");
  expect(m.html).toContain("/admin/relatorios/semanal?semana=2026-09-28");
});

it("andamento do cliente não cita reais e explica por que chegou", () => {
  const d = buildClientDigest(
    { organizationName: "ACME <Ltda>", projects: [{ id: "p", title: "Portal", deliverables: [{ title: "Entrega", status: "done", dueAt: null, completedAt: new Date("2026-10-01T12:00:00Z") }], milestones: [] }], requests: [] },
    "2026-10-05",
  );
  const m = renderWeeklyClient(d, base);
  expect(m.html).toContain("ACME &lt;Ltda&gt;");
  expect(m.html).toContain(`${base}/portal/projetos/p/relatorio`);
  expect(m.html).not.toContain("R$");
  expect(m.text).toContain("Minha conta");
});
