# Fase 12 — Relatórios: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quatro relatórios (status do projeto, portfólio, semanal e versão do cliente), imprimíveis em A4 e exportáveis em CSV, mais a ocultação temporária dos cases no site público.

**Architecture:** Módulo `src/modules/reports/` com funções puras (datas, CSV, builders) testadas em unidade, carregadores que leem o banco reaproveitando as queries de `projects`, `portal-projects` e `meetings`, e páginas renderizadas no servidor. Cada rota de CSV chama o mesmo builder da página. Impressão pelo navegador com CSS `print`.

**Tech Stack:** Next.js 16 (App Router, server components, route handlers), Drizzle ORM + Postgres, Tailwind com os tokens do tema, Vitest (unit + integração), Playwright (E2E + axe).

**Spec:** `docs/superpowers/specs/2026-09-30-fase-12-relatorios-design.md` (mockups em `docs/mockups/*relatorio*`).

## Global Constraints

- Sem dependências novas.
- CSV: UTF-8 com BOM, separador `;`, CRLF, datas `DD/MM/AAAA`, decimais com vírgula, reais sem símbolo; aspas quando o campo tem `;`, `"` ou quebra de linha; nome `relatorio-<slug>-<AAAA-MM-DD>.csv`.
- "Hoje" e semanas em `America/Sao_Paulo`; data de referência injetada nos builders.
- Atrasada = entrega não concluída com `dueAt < hoje`.
- Consumo do orçamento = (custo de horas + despesas) ÷ orçamento; `< 70` normal, `70–90` atenção, `> 90` alerta; sem orçamento → `null`.
- Cliente nunca recebe valores em reais, orçamento, prioridade, responsável por entrega, entregas com `visibleToClient = false` nem atas com `sharedWithClient = false`. Os builders do cliente não têm esses campos no tipo.
- Rótulos de status: admin usa os do kanban (`A fazer`, `Em progresso`, `Em revisão`, `Concluída`, `Bloqueada`); portal usa `portalStatusLabel` (bloqueada → `Em espera`).
- Horas no relatório do cliente só com `project.show_hours_to_client = true`; contam todos os lançamentos encerrados do projeto (sem títulos de entregas internas).
- Copy em português, sem jargão vago; seguir o tom dos mockups.

## Review Focus

- Projeto sem entregas, sem fases ou sem marcos → seções mostram texto de vazio, nunca `NaN%` nem divisão por zero. Teste em `build.test.ts` (Task 2).
- `?semana=` inválido, vazio ou uma quarta-feira → normaliza para a segunda da semana (ou a atual). Teste em `dates.test.ts` (Task 1).
- Título com `;`, aspas ou quebra de linha no CSV → célula continua íntegra no Excel. Teste em `csv.test.ts` (Task 1).
- Entrega concluída às 23h de domingo em Brasília (02h de segunda UTC) → conta na semana de Brasília. Teste em `build.test.ts` (Task 3).
- Cliente de outra organização pedindo o CSV do projeto → 404 sem corpo útil. Teste de integração (Task 5) e E2E (Task 8).

## File Structure

```
src/modules/reports/
  dates.ts                 datas puras (hoje SP, semana, rótulo ISO, formatação BR)
  csv.ts                   serialização CSV + resposta HTTP
  labels.ts                rótulos de status (admin) e de estado de marco
  build.ts                 buildProjectStatus, buildPortfolio, buildWeekly, buildClientReport (+ *Csv)
  queries.ts               loadProjectStatus, loadPortfolioData (admin)
  portal-queries.ts        loadClientReport (portal)
  components/report-sheet.tsx   ReportSheet, ReportSection, Stamp, Figures
  components/report-parts.tsx   PhaseRuler, StatusStack, MiniBar, LateTag
  components/report-toolbar.tsx ReportToolbar (Baixar CSV + Imprimir)
src/app/(admin)/admin/projetos/[id]/relatorio/page.tsx
src/app/(admin)/admin/projetos/[id]/relatorio/csv/route.ts
src/app/(admin)/admin/relatorios/layout.tsx          abas Portfólio | Semanal
src/app/(admin)/admin/relatorios/page.tsx            portfólio
src/app/(admin)/admin/relatorios/csv/route.ts
src/app/(admin)/admin/relatorios/semanal/page.tsx
src/app/(admin)/admin/relatorios/semanal/csv/route.ts
src/app/(portal)/portal/projetos/[id]/relatorio/page.tsx
src/app/(portal)/portal/projetos/[id]/relatorio/csv/route.ts
src/db/migrations/0010_*.sql                         show_hours_to_client
tests/unit/reports/{dates,csv,build}.test.ts
tests/integration/reports/reports.test.ts
tests/e2e/relatorios.spec.ts
```

Arquivos modificados: `projects/schema.ts` (coluna), `projects/validation.ts` + `form-actions.ts` + `actions.ts` + `components/project-form.tsx` + `editar/page.tsx` (chave), `portal-projects/queries.ts` (campos `showHoursToClient`, `completedAt`), `(admin)/layout.tsx` (sidebar), abas do projeto admin e portal, `app/globals.css` (regras `print` do relatório), testes E2E de acessibilidade e console. Cases: `content/site.ts`, `components/legacy/navbar.tsx`, `components/legacy/footer.tsx`, `(site)/page.tsx`, `(site)/sobre/page.tsx`, `(site)/produtos/page.tsx`, `(site)/cases/page.tsx`, `app/sitemap.ts`, `admin/cases/page.tsx`, testes E2E de site/SEO/cases/acessibilidade.

---

### Task 1: Datas e CSV (puros)

**Files:**
- Create: `src/modules/reports/dates.ts`, `src/modules/reports/csv.ts`
- Test: `tests/unit/reports/dates.test.ts`, `tests/unit/reports/csv.test.ts`

**Interfaces:**
- Produces:
  - `todayInSaoPaulo(now?: Date): string` (YYYY-MM-DD)
  - `dateInSaoPaulo(d: Date): string`
  - `addDays(iso: string, n: number): string`
  - `daysBetween(from: string, to: string): number` (to − from)
  - `mondayOf(iso: string): string`
  - `parseWeekParam(v: string | string[] | undefined, today: string): string` (segunda)
  - `isoWeekLabel(monday: string): string` (`2026-S40`)
  - `formatBr(iso: string | null): string` (`DD/MM/AAAA`, `""` para null)
  - `formatBrShort(iso: string): string` (`DD/MM`)
  - `formatMinutes(min: number): string` (`86h 30min`, `3h`, `0h`)
  - `toCsv(headers: string[], rows: CsvCell[][]): string`, `type CsvCell = string | number | null`
  - `csvDecimal(n: number, digits?: number): string`, `csvCents(cents: number | null): string`
  - `csvResponse(filename: string, body: string): Response`
  - `reportFilename(slug: string, today: string): string`

- [ ] **Step 1: Testes que falham** — `tests/unit/reports/dates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { addDays, daysBetween, formatBr, formatBrShort, formatMinutes, isoWeekLabel, mondayOf, parseWeekParam, todayInSaoPaulo, dateInSaoPaulo } from "@/modules/reports/dates";

describe("datas do relatório", () => {
  it("hoje em São Paulo vira o dia anterior antes das 03h UTC", () => {
    expect(todayInSaoPaulo(new Date("2026-10-05T02:30:00Z"))).toBe("2026-10-04");
    expect(todayInSaoPaulo(new Date("2026-10-05T03:30:00Z"))).toBe("2026-10-05");
    expect(dateInSaoPaulo(new Date("2026-10-05T02:00:00Z"))).toBe("2026-10-04");
  });
  it("soma dias atravessando mês e ano", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-09-22", "2026-09-30")).toBe(8);
  });
  it("segunda-feira da semana", () => {
    expect(mondayOf("2026-09-30")).toBe("2026-09-28"); // quarta
    expect(mondayOf("2026-10-04")).toBe("2026-09-28"); // domingo
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
  });
  it("parâmetro de semana inválido cai na semana de hoje", () => {
    expect(parseWeekParam(undefined, "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam("", "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam("2026-13-45", "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam("abc", "2026-09-30")).toBe("2026-09-28");
    expect(parseWeekParam(["2026-10-07"], "2026-09-30")).toBe("2026-10-05");
    expect(parseWeekParam("2026-10-08", "2026-09-30")).toBe("2026-10-05");
  });
  it("rótulo ISO da semana", () => {
    expect(isoWeekLabel("2026-09-28")).toBe("2026-S40");
    expect(isoWeekLabel("2026-12-28")).toBe("2026-S53");
    expect(isoWeekLabel("2027-01-04")).toBe("2027-S01");
    expect(isoWeekLabel("2024-12-30")).toBe("2025-S01");
  });
  it("formatação brasileira", () => {
    expect(formatBr("2026-09-05")).toBe("05/09/2026");
    expect(formatBr(null)).toBe("");
    expect(formatBrShort("2026-09-05")).toBe("05/09");
    expect(formatMinutes(5190)).toBe("86h 30min");
    expect(formatMinutes(180)).toBe("3h");
    expect(formatMinutes(0)).toBe("0h");
    expect(formatMinutes(45)).toBe("0h 45min");
  });
});
```

`tests/unit/reports/csv.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { csvCents, csvDecimal, reportFilename, toCsv } from "@/modules/reports/csv";

describe("csv", () => {
  it("BOM, ponto e vírgula e CRLF", () => {
    expect(toCsv(["a", "b"], [["1", 2]])).toBe("﻿a;b\r\n1;2\r\n");
  });
  it("escapa ; aspas e quebra de linha; null vira vazio", () => {
    const out = toCsv(["t"], [['Rede; "bloco B"\nfase 2'], [null]]);
    expect(out).toBe('﻿t\r\n"Rede; ""bloco B""\nfase 2"\r\n\r\n');
  });
  it("neutraliza fórmula no início da célula", () => {
    expect(toCsv(["t"], [["=HYPERLINK(1)"]])).toBe("﻿t\r\n'=HYPERLINK(1)\r\n");
  });
  it("decimais e reais com vírgula", () => {
    expect(csvDecimal(86.5, 1)).toBe("86,5");
    expect(csvDecimal(2, 2)).toBe("2,00");
    expect(csvCents(1297500)).toBe("12975,00");
    expect(csvCents(null)).toBe("");
  });
  it("nome do arquivo", () => {
    expect(reportFilename("laudo-infra", "2026-09-30")).toBe("relatorio-laudo-infra-2026-09-30.csv");
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/unit/reports` → FAIL (módulos inexistentes).

- [ ] **Step 3: Implementação** — `src/modules/reports/dates.ts`:

```ts
/** Datas dos relatórios. Tudo em 'YYYY-MM-DD'; "hoje" e semanas no fuso de Brasília. */
const SP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const dateInSaoPaulo = (d: Date): string => SP.format(d);
export const todayInSaoPaulo = (now: Date = new Date()): string => dateInSaoPaulo(now);

const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (iso: string, n: number): string => {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
};
export const daysBetween = (from: string, to: string): number => Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);

export function mondayOf(iso: string): string {
  const dow = toUtc(iso).getUTCDay(); // 0 = domingo
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

const isValidIso = (v: string) => ISO.test(v) && fromUtc(toUtc(v)) === v;

export function parseWeekParam(v: string | string[] | undefined, today: string): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return mondayOf(raw && isValidIso(raw) ? raw : today);
}

/** Semana ISO 8601 (a que contém a quinta-feira). */
export function isoWeekLabel(monday: string): string {
  const thursday = toUtc(addDays(monday, 3));
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.floor((thursday.getTime() - jan1) / 86_400_000 / 7) + 1;
  return `${year}-S${String(week).padStart(2, "0")}`;
}

export const formatBr = (iso: string | null): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
export const formatBrShort = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
```

`src/modules/reports/csv.ts`:

```ts
/** CSV para Excel em português: BOM, ';' e CRLF. */
export type CsvCell = string | number | null;

function cell(v: CsvCell): string {
  if (v === null) return "";
  let s = String(v);
  // Evita que o Excel interprete a célula como fórmula.
  if (/^[=+\-@]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(cell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export const csvDecimal = (n: number, digits = 1): string => n.toFixed(digits).replace(".", ",");
export const csvCents = (cents: number | null): string => (cents === null ? "" : csvDecimal(cents / 100, 2));

export const reportFilename = (slug: string, today: string): string => `relatorio-${slug}-${today}.csv`;

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

Nota: o teste de fórmula usa `"=HYPERLINK(1)"`; números negativos (`-3`) chegam como `number` e não recebem apóstrofo.

- [ ] **Step 4:** `npx vitest run tests/unit/reports` → PASS.
- [ ] **Step 5:** Commit `Relatórios: datas em Brasília e CSV para Excel`.

---

### Task 2: Builder do relatório de status (puro)

**Files:**
- Create: `src/modules/reports/labels.ts`, `src/modules/reports/build.ts`
- Test: `tests/unit/reports/build.test.ts`

**Interfaces:**
- Consumes: Task 1; `isOverdue`, `priorityRank`, `PRIORITY_LABEL`, `Priority` de `@/modules/projects/priority`.
- Produces (em `build.ts`):

```ts
export type DeliverableStatus = "todo" | "doing" | "review" | "done" | "blocked";
export type ReportPhase = { id: string; name: string; position: number; startedAt: string | null; endedAt: string | null };
export type ReportMilestone = { id: string; name: string; dueAt: string; completedAt: Date | null; phaseId: string | null };
export type ReportDeliverable = {
  id: string; title: string; status: DeliverableStatus; priority: Priority;
  dueAt: string | null; completedAt: Date | null; phaseId: string | null;
  assigneeName: string | null; minutes: number; laborCents: number;
};
export type ReportMeeting = { id: string; title: string; heldAt: Date; decisions: string | null; sharedWithClient: boolean };
export type PhaseProgress = { id: string | null; name: string; startedAt: string | null; endedAt: string | null; total: number; done: number; percent: number };
export type MilestoneLine = { id: string; name: string; phaseName: string | null; dueAt: string; state: "done" | "late" | "pending"; completedOn: string | null; days: number };
export type BudgetBand = "ok" | "warn" | "alert";
export type ProjectStatusInput = {
  project: { title: string; companyName: string; status: string; startedAt: string | null; endedAt: string | null; ownerName: string; budgetCents: number | null };
  phases: ReportPhase[]; milestones: ReportMilestone[]; deliverables: ReportDeliverable[];
  expenseCents: number; entriesWithoutRate: number; entriesCount: number; meetings: ReportMeeting[];
};
export type ProjectStatusReport = ReturnType<typeof buildProjectStatus>;
export function buildProjectStatus(input: ProjectStatusInput, today: string): {
  progress: { total: number; done: number; percent: number | null };
  byStatus: Record<DeliverableStatus, number>;
  phases: PhaseProgress[];
  issues: (ReportDeliverable & { phaseName: string | null; daysLate: number | null })[];
  overdueCount: number; blockedCount: number;
  milestones: MilestoneLine[]; nextMilestone: MilestoneLine | null;
  money: { minutes: number; laborCents: number; expenseCents: number; costCents: number; budgetCents: number | null; consumption: number | null; band: BudgetBand | null; entriesWithoutRate: number; entriesCount: number };
  meetings: ReportMeeting[];
};
export function budgetBand(pct: number | null): BudgetBand | null;
export function projectStatusCsv(input: ProjectStatusInput, report: ProjectStatusReport, today: string): { headers: string[]; rows: CsvCell[][] };
```

- `labels.ts`: `export const ADMIN_STATUS_LABEL: Record<DeliverableStatus, string>` (`todo: "A fazer", doing: "Em progresso", review: "Em revisão", done: "Concluída", blocked: "Bloqueada"`), `export const STATUS_ORDER = ["done","review","doing","todo","blocked"] as const` (ordem da barra empilhada), `export const PROJECT_STATUS_ADMIN_LABEL` (`planning: "Planejamento", active: "Ativo", on_hold: "Pausado", delivered: "Entregue", cancelled: "Cancelado"`), `export function milestoneText(m: MilestoneLine): string` → `concluído em DD/MM` | `atrasado N dias` (`1 dia`) | `hoje` | `em N dias` (`amanhã` para 1).

Regras:
- Progresso por fase segue a ordem de `position`; entregas sem fase viram uma linha `{ id: null, name: "Sem fase" }` no fim, só se existir alguma.
- `issues` = atrasadas (`isOverdue`) ∪ bloqueadas, ordenadas por prioridade (`priorityRank`), depois `daysLate` desc (bloqueada sem atraso = −1), depois título.
- `nextMilestone` = primeiro marco não concluído por `dueAt` (pode estar atrasado).
- `money.consumption = budget ? Math.round(cost / budget * 100) : null`.
- `meetings` = as 3 mais recentes por `heldAt`.
- CSV: cabeçalho `Fase;Entrega;Status;Prioridade;Responsável;Prazo;Concluída em;Dias de atraso;Horas;Custo de horas (R$)`, uma linha por entrega em ordem de fase e depois prazo (sem prazo por último).

- [ ] **Step 1: Testes que falham** — `tests/unit/reports/build.test.ts` (primeira parte; Tasks 3 e 4 acrescentam `describe`s):

```ts
import { describe, it, expect } from "vitest";
import { budgetBand, buildProjectStatus, projectStatusCsv, type ProjectStatusInput, type ReportDeliverable } from "@/modules/reports/build";

const TODAY = "2026-09-30";
const d = (over: Partial<ReportDeliverable>): ReportDeliverable => ({
  id: Math.random().toString(36).slice(2), title: "Entrega", status: "todo", priority: "medium",
  dueAt: null, completedAt: null, phaseId: null, assigneeName: null, minutes: 0, laborCents: 0, ...over,
});
const base = (over: Partial<ProjectStatusInput> = {}): ProjectStatusInput => ({
  project: { title: "Laudo", companyName: "Vale Norte", status: "active", startedAt: "2026-09-01", endedAt: null, ownerName: "Eugênio", budgetCents: 2_000_000 },
  phases: [
    { id: "f1", name: "Levantamento", position: 0, startedAt: "2026-09-01", endedAt: "2026-09-15" },
    { id: "f2", name: "Diagnóstico", position: 1, startedAt: "2026-09-16", endedAt: "2026-10-09" },
  ],
  milestones: [], deliverables: [], expenseCents: 0, entriesWithoutRate: 0, entriesCount: 0, meetings: [], ...over,
});

describe("relatório de status", () => {
  it("projeto vazio: sem percentual, sem NaN, sem linha Sem fase", () => {
    const r = buildProjectStatus(base(), TODAY);
    expect(r.progress).toEqual({ total: 0, done: 0, percent: null });
    expect(r.phases.map((p) => [p.name, p.total, p.percent])).toEqual([["Levantamento", 0, 0], ["Diagnóstico", 0, 0]]);
    expect(r.issues).toEqual([]);
    expect(r.nextMilestone).toBeNull();
  });

  it("progresso por fase com Sem fase no fim", () => {
    const r = buildProjectStatus(base({ deliverables: [
      d({ phaseId: "f1", status: "done" }), d({ phaseId: "f1", status: "done" }),
      d({ phaseId: "f2", status: "doing" }), d({ phaseId: null, status: "todo" }),
    ] }), TODAY);
    expect(r.progress).toEqual({ total: 4, done: 2, percent: 50 });
    expect(r.phases.map((p) => [p.name, p.done, p.total, p.percent])).toEqual([
      ["Levantamento", 2, 2, 100], ["Diagnóstico", 0, 1, 0], ["Sem fase", 0, 1, 0],
    ]);
    expect(r.byStatus).toEqual({ todo: 1, doing: 1, review: 0, done: 2, blocked: 0 });
  });

  it("atrasadas e bloqueadas por prioridade e atraso", () => {
    const r = buildProjectStatus(base({ deliverables: [
      d({ title: "B", priority: "medium", dueAt: "2026-09-29" }),
      d({ title: "A", priority: "urgent", dueAt: "2026-09-22" }),
      d({ title: "C", priority: "high", status: "blocked", dueAt: "2026-10-03" }),
      d({ title: "D", priority: "high", dueAt: "2026-09-26" }),
      d({ title: "ok", status: "done", dueAt: "2026-09-01" }),
      d({ title: "futura", dueAt: "2026-10-30" }),
    ] }), TODAY);
    expect(r.issues.map((i) => [i.title, i.daysLate])).toEqual([["A", 8], ["D", 4], ["C", null], ["B", 1]]);
    expect(r.overdueCount).toBe(3);
    expect(r.blockedCount).toBe(1);
  });

  it("marcos: concluído, atrasado, pendente e próximo marco", () => {
    const r = buildProjectStatus(base({ milestones: [
      { id: "m1", name: "Kickoff", dueAt: "2026-09-02", completedAt: new Date("2026-09-02T15:00:00Z"), phaseId: "f1" },
      { id: "m2", name: "Aprovação", dueAt: "2026-09-25", completedAt: null, phaseId: "f1" },
      { id: "m3", name: "Laudo", dueAt: "2026-10-09", completedAt: null, phaseId: "f2" },
    ] }), TODAY);
    expect(r.milestones.map((m) => [m.name, m.state, m.days, m.phaseName])).toEqual([
      ["Kickoff", "done", 0, "Levantamento"], ["Aprovação", "late", 5, "Levantamento"], ["Laudo", "pending", 9, "Diagnóstico"],
    ]);
    expect(r.nextMilestone?.name).toBe("Aprovação");
  });

  it("dinheiro: custo, consumo e faixas", () => {
    const r = buildProjectStatus(base({ deliverables: [d({ minutes: 5190, laborCents: 1_297_500 })], expenseCents: 184_000 }), TODAY);
    expect(r.money).toMatchObject({ minutes: 5190, laborCents: 1_297_500, costCents: 1_481_500, consumption: 74, band: "warn" });
    expect(buildProjectStatus(base({ project: { ...base().project, budgetCents: null } }), TODAY).money.consumption).toBeNull();
    expect([budgetBand(null), budgetBand(69), budgetBand(70), budgetBand(90), budgetBand(91)]).toEqual([null, "ok", "warn", "warn", "alert"]);
  });

  it("últimas 3 atas, mais recentes primeiro", () => {
    const m = (id: string, at: string) => ({ id, title: id, heldAt: new Date(at), decisions: null, sharedWithClient: false });
    const r = buildProjectStatus(base({ meetings: [m("a", "2026-09-02"), m("b", "2026-09-24"), m("c", "2026-09-10"), m("d", "2026-08-01")] }), TODAY);
    expect(r.meetings.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("CSV com uma linha por entrega, na ordem de fase e prazo", () => {
    const input = base({ deliverables: [
      d({ title: "Sem prazo", phaseId: "f1" }),
      d({ title: "Mapa; rede", phaseId: "f1", dueAt: "2026-09-29", assigneeName: "Rafael", minutes: 90, laborCents: 22_500, priority: "high" }),
      d({ title: "Solta", status: "done", completedAt: new Date("2026-09-20T12:00:00Z"), dueAt: "2026-09-19" }),
    ] });
    const { headers, rows } = projectStatusCsv(input, buildProjectStatus(input, TODAY), TODAY);
    expect(headers).toEqual(["Fase", "Entrega", "Status", "Prioridade", "Responsável", "Prazo", "Concluída em", "Dias de atraso", "Horas", "Custo de horas (R$)"]);
    expect(rows).toEqual([
      ["Levantamento", "Mapa; rede", "A fazer", "Alta", "Rafael", "29/09/2026", "", 1, "1,5", "225,00"],
      ["Levantamento", "Sem prazo", "A fazer", "Média", "", "", "", null, "0,0", "0,00"],
      ["Sem fase", "Solta", "Concluída", "Média", "", "19/09/2026", "20/09/2026", null, "0,0", "0,00"],
    ]);
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/unit/reports/build.test.ts` → FAIL.

- [ ] **Step 3: Implementação** de `labels.ts` e da parte de status em `build.ts`:

```ts
// src/modules/reports/build.ts
import { isOverdue, priorityRank, PRIORITY_LABEL, type Priority } from "@/modules/projects/priority";
import { csvCents, csvDecimal, type CsvCell } from "./csv";
import { daysBetween, dateInSaoPaulo, formatBr } from "./dates";
import { ADMIN_STATUS_LABEL } from "./labels";

// (tipos da seção Interfaces)

export function budgetBand(pct: number | null): BudgetBand | null {
  if (pct === null) return null;
  if (pct > 90) return "alert";
  return pct >= 70 ? "warn" : "ok";
}

const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));
const byDueThenTitle = (a: { dueAt: string | null; title: string }, b: { dueAt: string | null; title: string }) =>
  (a.dueAt ?? "9999-12-31").localeCompare(b.dueAt ?? "9999-12-31") || a.title.localeCompare(b.title, "pt-BR");

export function phaseProgress(phases: ReportPhase[], items: { phaseId: string | null; status: DeliverableStatus }[]): PhaseProgress[] {
  const rows: PhaseProgress[] = [...phases].sort((a, b) => a.position - b.position).map((p) => {
    const mine = items.filter((i) => i.phaseId === p.id);
    const done = mine.filter((i) => i.status === "done").length;
    return { id: p.id, name: p.name, startedAt: p.startedAt, endedAt: p.endedAt, total: mine.length, done, percent: pct(done, mine.length) };
  });
  const known = new Set(phases.map((p) => p.id));
  const loose = items.filter((i) => i.phaseId === null || !known.has(i.phaseId));
  if (loose.length > 0) {
    const done = loose.filter((i) => i.status === "done").length;
    rows.push({ id: null, name: "Sem fase", startedAt: null, endedAt: null, total: loose.length, done, percent: pct(done, loose.length) });
  }
  return rows;
}

export function milestoneLines(milestones: ReportMilestone[], phases: ReportPhase[], today: string): MilestoneLine[] {
  const phaseName = new Map(phases.map((p) => [p.id, p.name]));
  return [...milestones].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).map((m) => {
    const completedOn = m.completedAt ? dateInSaoPaulo(m.completedAt) : null;
    const state = completedOn ? "done" : m.dueAt < today ? "late" : "pending";
    const days = state === "done" ? 0 : Math.abs(daysBetween(today, m.dueAt));
    return { id: m.id, name: m.name, phaseName: m.phaseId ? phaseName.get(m.phaseId) ?? null : null, dueAt: m.dueAt, state, completedOn, days };
  });
}

export function buildProjectStatus(input: ProjectStatusInput, today: string) {
  const ds = input.deliverables;
  const done = ds.filter((x) => x.status === "done").length;
  const byStatus = { todo: 0, doing: 0, review: 0, done: 0, blocked: 0 } as Record<DeliverableStatus, number>;
  for (const x of ds) byStatus[x.status] += 1;
  const phaseName = new Map(input.phases.map((p) => [p.id, p.name]));

  const issues = ds
    .filter((x) => isOverdue(x, today) || x.status === "blocked")
    .map((x) => ({ ...x, phaseName: x.phaseId ? phaseName.get(x.phaseId) ?? null : null, daysLate: isOverdue(x, today) ? daysBetween(x.dueAt as string, today) : null }))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (b.daysLate ?? -1) - (a.daysLate ?? -1) || a.title.localeCompare(b.title, "pt-BR"));

  const milestones = milestoneLines(input.milestones, input.phases, today);
  const minutes = ds.reduce((s, x) => s + x.minutes, 0);
  const laborCents = ds.reduce((s, x) => s + x.laborCents, 0);
  const costCents = laborCents + input.expenseCents;
  const budget = input.project.budgetCents;
  const consumption = budget && budget > 0 ? Math.round((costCents / budget) * 100) : null;

  return {
    progress: { total: ds.length, done, percent: ds.length === 0 ? null : pct(done, ds.length) },
    byStatus,
    phases: phaseProgress(input.phases, ds),
    issues,
    overdueCount: ds.filter((x) => isOverdue(x, today)).length,
    blockedCount: byStatus.blocked,
    milestones,
    nextMilestone: milestones.find((m) => m.state !== "done") ?? null,
    money: { minutes, laborCents, expenseCents: input.expenseCents, costCents, budgetCents: budget, consumption, band: budgetBand(consumption), entriesWithoutRate: input.entriesWithoutRate, entriesCount: input.entriesCount },
    meetings: [...input.meetings].sort((a, b) => b.heldAt.getTime() - a.heldAt.getTime()).slice(0, 3),
  };
}

export function projectStatusCsv(input: ProjectStatusInput, report: ProjectStatusReport, today: string) {
  const order = new Map(report.phases.map((p, i) => [p.id, i]));
  const phaseOf = (x: ReportDeliverable) => (x.phaseId && order.has(x.phaseId) ? x.phaseId : null);
  const rows = [...input.deliverables]
    .sort((a, b) => (order.get(phaseOf(a)) ?? 999) - (order.get(phaseOf(b)) ?? 999) || byDueThenTitle(a, b))
    .map((x): CsvCell[] => [
      report.phases[order.get(phaseOf(x)) ?? -1]?.name ?? "Sem fase",
      x.title,
      ADMIN_STATUS_LABEL[x.status],
      PRIORITY_LABEL[x.priority],
      x.assigneeName ?? "",
      formatBr(x.dueAt),
      x.completedAt ? formatBr(dateInSaoPaulo(x.completedAt)) : "",
      isOverdue(x, today) ? daysBetween(x.dueAt as string, today) : null,
      csvDecimal(x.minutes / 60, 1),
      csvCents(x.laborCents),
    ]);
  return { headers: ["Fase", "Entrega", "Status", "Prioridade", "Responsável", "Prazo", "Concluída em", "Dias de atraso", "Horas", "Custo de horas (R$)"], rows };
}
```

- [ ] **Step 4:** testes PASS.
- [ ] **Step 5:** Commit `Relatórios: builder do relatório de status`.

---

### Task 3: Builders de portfólio e semanal (puros)

**Files:**
- Modify: `src/modules/reports/build.ts`
- Test: `tests/unit/reports/build.test.ts` (novos `describe`)

**Interfaces:**
- Produces:

```ts
export type PortfolioProjectInput = {
  id: string; title: string; slug: string; companyName: string; status: "planning" | "active" | "on_hold";
  budgetCents: number | null; minutes: number; laborCents: number; expenseCents: number;
  deliverables: { id: string; title: string; status: DeliverableStatus; dueAt: string | null; completedAt: Date | null }[];
  milestones: { id: string; name: string; dueAt: string; completedAt: Date | null }[];
};
export type PortfolioRow = { id: string; title: string; companyName: string; status: PortfolioProjectInput["status"]; percent: number | null; total: number; done: number; nextMilestone: { name: string; dueAt: string } | null; overdue: number; blocked: number; minutes: number; costCents: number; budgetCents: number | null; consumption: number | null; band: BudgetBand | null; nextDue: string | null };
export function buildPortfolio(projects: PortfolioProjectInput[], today: string): { rows: PortfolioRow[]; counts: Record<"planning" | "active" | "on_hold", number>; overdueTotal: number };
export function portfolioCsv(p: ReturnType<typeof buildPortfolio>): { headers: string[]; rows: CsvCell[][] };

export type WeeklyItem = { kind: "deliverable" | "milestone"; title: string; date: string; daysLate: number | null };
export type WeeklyProject = { id: string; title: string; companyName: string; done: WeeklyItem[]; due: WeeklyItem[]; late: WeeklyItem[] };
export function buildWeekly(projects: PortfolioProjectInput[], monday: string, today: string): { start: string; end: string; nextStart: string; nextEnd: string; label: string; projects: WeeklyProject[]; doneCount: number };
export function weeklyCsv(w: ReturnType<typeof buildWeekly>): { headers: string[]; rows: CsvCell[][] };
```

Regras:
- Portfólio: `nextDue` = menor prazo entre entregas e marcos em aberto com data ≥ hoje; ordena por `overdue` desc, depois `nextDue` (null por último), depois título.
- CSV do portfólio: `Projeto;Cliente;Status;Progresso (%);Próximo marco;Data do próximo marco;Atrasadas;Bloqueadas;Horas;Orçamento (R$);Custo de horas (R$);Despesas (R$);Consumo do orçamento (%)`.
- Semanal: `end = monday + 6`, `nextStart = monday + 7`, `nextEnd = monday + 13`. **Concluído**: entregas `done` e marcos com `dateInSaoPaulo(completedAt)` em [start, end]. **Vence**: entregas não concluídas e marcos não concluídos com `dueAt` em [nextStart, nextEnd]. **Atrasado**: entregas não concluídas com `dueAt < today` (com `daysLate`). Cada grupo ordenado por data (atrasado: maior atraso primeiro). Projeto sem nenhum item em nenhum grupo é omitido; projetos ordenados por título. `doneCount` = soma dos concluídos.
- CSV semanal: `Projeto;Cliente;Tipo;Grupo;Título;Data;Dias de atraso` com `Tipo` = `Entrega`/`Marco`, `Grupo` = `Concluído`/`Vence`/`Atrasado`.

- [ ] **Step 1: Testes que falham** (anexar a `build.test.ts`):

```ts
import { buildPortfolio, buildWeekly, portfolioCsv, weeklyCsv, type PortfolioProjectInput } from "@/modules/reports/build";

const proj = (over: Partial<PortfolioProjectInput>): PortfolioProjectInput => ({
  id: "p", title: "P", slug: "p", companyName: "C", status: "active", budgetCents: null, minutes: 0, laborCents: 0, expenseCents: 0,
  deliverables: [], milestones: [], ...over,
});

describe("portfólio", () => {
  it("ordena por atrasadas e depois pelo próximo prazo; conta status", () => {
    const r = buildPortfolio([
      proj({ id: "a", title: "Sem atraso", deliverables: [{ id: "1", title: "x", status: "todo", dueAt: "2026-10-02", completedAt: null }] }),
      proj({ id: "b", title: "Dois atrasos", status: "on_hold", deliverables: [
        { id: "2", title: "x", status: "todo", dueAt: "2026-09-01", completedAt: null },
        { id: "3", title: "y", status: "blocked", dueAt: "2026-09-02", completedAt: null },
      ] }),
      proj({ id: "c", title: "Vazio" }),
      proj({ id: "d", title: "Próximo antes", milestones: [{ id: "m", name: "Go-live", dueAt: "2026-10-01", completedAt: null }] }),
    ], TODAY);
    expect(r.rows.map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
    expect(r.rows[0]).toMatchObject({ overdue: 2, blocked: 1, percent: 0 });
    expect(r.rows.find((x) => x.id === "c")?.percent).toBeNull();
    expect(r.rows.find((x) => x.id === "d")?.nextMilestone).toEqual({ name: "Go-live", dueAt: "2026-10-01" });
    expect(r.counts).toEqual({ planning: 0, active: 3, on_hold: 1 });
    expect(r.overdueTotal).toBe(2);
  });
  it("consumo do orçamento e CSV", () => {
    const r = buildPortfolio([proj({ title: "Obras", budgetCents: 1_000_000, laborCents: 900_000, expenseCents: 60_000, minutes: 7200 })], TODAY);
    expect(r.rows[0]).toMatchObject({ costCents: 960_000, consumption: 96, band: "alert" });
    const csv = portfolioCsv(r);
    expect(csv.headers[0]).toBe("Projeto");
    expect(csv.rows[0]).toEqual(["Obras", "C", "Ativo", "", "", "", 0, 0, "120,0", "10000,00", "9000,00", "600,00", 96]);
  });
});

describe("semanal", () => {
  const MON = "2026-09-28";
  it("agrupa concluído, vence na semana seguinte e atrasado; omite projeto parado", () => {
    const w = buildWeekly([
      proj({ id: "a", title: "Laudo", deliverables: [
        { id: "1", title: "Nobreaks", status: "done", dueAt: "2026-09-29", completedAt: new Date("2026-09-29T15:00:00Z") },
        { id: "2", title: "Domingo tarde", status: "done", dueAt: null, completedAt: new Date("2026-10-05T02:00:00Z") }, // 04/10 23h em Brasília
        { id: "3", title: "Semana passada", status: "done", dueAt: null, completedAt: new Date("2026-09-27T12:00:00Z") },
        { id: "4", title: "Vulnerabilidades", status: "todo", dueAt: "2026-10-07", completedAt: null },
        { id: "5", title: "Switches", status: "doing", dueAt: "2026-09-22", completedAt: null },
        { id: "6", title: "Longe", status: "todo", dueAt: "2026-11-20", completedAt: null },
      ], milestones: [
        { id: "m1", name: "Levantamento aprovado", dueAt: "2026-09-25", completedAt: new Date("2026-09-30T18:00:00Z") },
        { id: "m2", name: "Laudo preliminar", dueAt: "2026-10-09", completedAt: null },
      ] }),
      proj({ id: "b", title: "Parado", deliverables: [{ id: "7", title: "Futuro", status: "todo", dueAt: "2026-12-01", completedAt: null }] }),
    ], MON, TODAY);
    expect(w).toMatchObject({ start: "2026-09-28", end: "2026-10-04", nextStart: "2026-10-05", nextEnd: "2026-10-11", label: "2026-S40", doneCount: 3 });
    expect(w.projects.map((p) => p.id)).toEqual(["a"]);
    const a = w.projects[0];
    expect(a.done.map((i) => [i.kind, i.title, i.date])).toEqual([
      ["deliverable", "Nobreaks", "2026-09-29"], ["milestone", "Levantamento aprovado", "2026-09-30"], ["deliverable", "Domingo tarde", "2026-10-04"],
    ]);
    expect(a.due.map((i) => i.title)).toEqual(["Vulnerabilidades", "Laudo preliminar"]);
    expect(a.late.map((i) => [i.title, i.daysLate])).toEqual([["Switches", 8]]);
    expect(weeklyCsv(w).rows[0]).toEqual(["Laudo", "C", "Entrega", "Concluído", "Nobreaks", "29/09/2026", null]);
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3:** implementar `buildPortfolio`, `portfolioCsv`, `buildWeekly`, `weeklyCsv` seguindo as regras (usar `PROJECT_STATUS_ADMIN_LABEL` no CSV, `formatBr` nas datas, `csvDecimal(minutes/60,1)`, `csvCents`). **Step 4:** PASS. **Step 5:** Commit `Relatórios: portfólio e semanal`.

---

### Task 4: Builder do relatório do cliente (puro)

**Files:**
- Modify: `src/modules/reports/build.ts`
- Test: `tests/unit/reports/build.test.ts`

**Interfaces:**
- Consumes: `portalStatusLabel` de `@/modules/portal-projects/scope`; `phaseProgress`, `milestoneLines` (Task 2).
- Produces:

```ts
export type ClientReportInput = {
  project: { title: string; companyName: string; startedAt: string | null; endedAt: string | null; ownerName: string; showHoursToClient: boolean };
  phases: ReportPhase[];
  milestones: ReportMilestone[];
  deliverables: { id: string; title: string; status: DeliverableStatus; dueAt: string | null; completedAt: Date | null; phaseId: string | null }[]; // só visíveis
  meetings: { id: string; title: string; heldAt: Date; decisions: string | null }[]; // só compartilhadas
  minutesByPhase: { phaseId: string | null; minutes: number }[]; // todos os lançamentos encerrados
};
export function buildClientReport(input: ClientReportInput, today: string): {
  progress: { total: number; done: number; percent: number | null };
  phases: PhaseProgress[];
  milestones: MilestoneLine[];
  open: { id: string; title: string; phaseName: string | null; statusLabel: string; blocked: boolean; dueAt: string | null; late: boolean }[];
  hours: null | { totalMinutes: number; byPhase: { name: string; minutes: number }[] };
  meetings: ClientReportInput["meetings"];
};
export function clientReportCsv(input: ClientReportInput, today: string): { headers: string[]; rows: CsvCell[][] };
```

Regras: `open` = entregas não concluídas por prazo (sem prazo por último); `hours` = `null` quando `showHoursToClient` é falso; `byPhase` só com fases que têm minutos, na ordem das fases, "Sem fase" no fim; `meetings` por `heldAt` desc. CSV: `Fase;Entrega;Status;Prazo;Concluída em`, uma linha por entrega visível, na ordem de fase e prazo. Sem coluna de horas: horas por entrega exporiam o esforço em trabalho interno; as horas (total e por fase) ficam só na tela e na impressão.

- [ ] **Step 1: Testes que falham:**

```ts
import { buildClientReport, clientReportCsv, type ClientReportInput } from "@/modules/reports/build";

const clientBase = (over: Partial<ClientReportInput> = {}): ClientReportInput => ({
  project: { title: "Laudo", companyName: "Vale Norte", startedAt: "2026-09-01", endedAt: null, ownerName: "Eugênio", showHoursToClient: false },
  phases: [{ id: "f1", name: "Levantamento", position: 0, startedAt: null, endedAt: null }],
  milestones: [],
  deliverables: [
    { id: "1", title: "Inventário", status: "blocked", dueAt: "2026-09-22", completedAt: null, phaseId: "f1" },
    { id: "2", title: "Relatório", status: "done", dueAt: "2026-09-10", completedAt: new Date("2026-09-10T12:00:00Z"), phaseId: "f1" },
  ],
  meetings: [], minutesByPhase: [{ phaseId: "f1", minutes: 1860 }, { phaseId: null, minutes: 180 }], ...over,
});

describe("relatório do cliente", () => {
  it("sem nenhum campo de dinheiro, prioridade ou responsável", () => {
    const r = buildClientReport(clientBase(), TODAY);
    const json = JSON.stringify(r);
    for (const k of ["Cents", "budget", "priority", "assignee", "cost"]) expect(json).not.toContain(k);
  });
  it("bloqueada aparece como Em espera e atrasada é marcada", () => {
    const r = buildClientReport(clientBase(), TODAY);
    expect(r.open).toEqual([{ id: "1", title: "Inventário", phaseName: "Levantamento", statusLabel: "Em espera", blocked: true, dueAt: "2026-09-22", late: true }]);
    expect(r.progress).toEqual({ total: 2, done: 1, percent: 50 });
  });
  it("horas só com a chave ligada", () => {
    expect(buildClientReport(clientBase(), TODAY).hours).toBeNull();
    const on = buildClientReport(clientBase({ project: { ...clientBase().project, showHoursToClient: true } }), TODAY);
    expect(on.hours).toEqual({ totalMinutes: 2040, byPhase: [{ name: "Levantamento", minutes: 1860 }, { name: "Sem fase", minutes: 180 }] });
  });
  it("CSV com cinco colunas", () => {
    const { headers, rows } = clientReportCsv(clientBase(), TODAY);
    expect(headers).toEqual(["Fase", "Entrega", "Status", "Prazo", "Concluída em"]);
    expect(rows).toEqual([
      ["Levantamento", "Relatório", "Concluída", "10/09/2026", "10/09/2026"],
      ["Levantamento", "Inventário", "Em espera", "22/09/2026", ""],
    ]);
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS. **Step 5:** Commit `Relatórios: versão do cliente sem valores`.

---

### Task 5: Coluna `show_hours_to_client`, carregadores e testes de integração

**Files:**
- Modify: `src/modules/projects/schema.ts` (adicionar `showHoursToClient: boolean().default(false).notNull()` após `notes`)
- Create: `src/db/migrations/0010_*.sql` via `npm run db:generate` (renomear para `0010_show_hours_to_client.sql` e ajustar o `tag` no `meta/_journal.json`)
- Modify: `src/modules/projects/validation.ts` (`showHoursToClient: z.union([z.literal("on"), z.literal(""), z.boolean()]).optional().transform((v) => v === true || v === "on")`), `form-actions.ts` (`showHoursToClient: fd.get("showHoursToClient") === "on"`), `actions.ts` (`updateProject` grava `showHoursToClient`), `components/project-form.tsx` (checkbox "Mostrar horas ao cliente" com dica "O relatório do portal passa a mostrar o total de horas e as horas por fase. Nunca mostra valores."), `editar/page.tsx` (passar `showHoursToClient`)
- Modify: `src/modules/portal-projects/queries.ts` (`getPortalProject` inclui `showHoursToClient`; `listPortalDeliverables` inclui `completedAt`)
- Create: `src/modules/reports/queries.ts`, `src/modules/reports/portal-queries.ts`
- Test: `tests/integration/reports/reports.test.ts`

**Interfaces:**
- Produces:
  - `loadProjectStatus(ctx: AdminContext, id: string): Promise<{ input: ProjectStatusInput; projectId: string; slug: string } | null>` — usa `getProject`, `listPhases`, `listMilestones`, `listDeliverables`, `listTimeCostsByDeliverable`, `listMeetings(ctx, { projectId: id })`; `expenseCents` por `sum(amount_cents)`; `entriesCount` = lançamentos encerrados do projeto. `slug` = `slugify(title)` (usar o helper existente de `@/lib` / `modules/crm` — procurar `slugify` com `grep -rn "export function slugify" src`).
  - `loadPortfolioData(ctx: AdminContext): Promise<PortfolioProjectInput[]>` — projetos `archivedAt is null` e `status in ('planning','active','on_hold')` com empresa; entregas e marcos por `inArray`; minutos e custo por projeto num `select ... group by project_id` sobre `project_time_entry` encerrados (mesma fórmula de `listTimeCostsByDeliverable`); despesas por `group by`.
  - `loadClientReport(ctx: PortalContext, id: string): Promise<{ input: ClientReportInput; slug: string } | null>` — `getPortalProject` (null → null), `listPortalPhases`, `listPortalMilestones`, `listPortalDeliverables`, atas `sharedWithClient` do projeto (query nova filtrando `meeting.projectId = id`, `sharedWithClient = true`), `minutesByPhase` só quando `showHoursToClient` (senão `[]`), agrupando lançamentos encerrados de **todas** as entregas do projeto por `phase_id`.

- [ ] **Step 1: Teste de integração que falha** — `tests/integration/reports/reports.test.ts` monta com o mesmo padrão de `tests/integration/meetings/meetings.test.ts` (orgs A/B, empresas, `makeProject`) e verifica:
  1. `loadProjectStatus(admin, projA)` devolve entregas com `minutes`/`laborCents` vindos de lançamentos (inserir `users.hourlyRateCents = 15000` no admin e um `project_time_entry` de 90 min encerrado) → `input.deliverables[0].laborCents === 22500`; `expenseCents` soma duas despesas; `meetings` contém a ata do projeto.
  2. `loadProjectStatus(admin, "nao-e-uuid")` e com uuid inexistente → `null`.
  3. `loadPortfolioData(admin)` inclui `projA` (active) e exclui um projeto `delivered` e um arquivado.
  4. `loadClientReport(ctxA, projA)`: só a entrega visível, só a ata compartilhada; `JSON.stringify` não contém o título da entrega interna nem da ata não compartilhada; `minutesByPhase` vazio com a chave desligada e preenchido (incluindo os minutos da entrega interna) depois de `updateProject(admin, projA, { ..., showHoursToClient: true })`.
  5. `loadClientReport(ctxB, projA)` → `null`.
  6. `updateProject` com `showHoursToClient: "on"` grava `true`; sem o campo grava `false`.

- [ ] **Step 2:** `npm run test:integration -- tests/integration/reports` → FAIL.
- [ ] **Step 3:** schema + `npm run db:generate` + migração local (`npm run db:migrate`), ajustes de formulário e as três funções de carga.
- [ ] **Step 4:** PASS; rodar `npm run test:integration` inteiro (projects e portal continuam verdes).
- [ ] **Step 5:** Commit `Relatórios: carregadores e chave "mostrar horas ao cliente"`.

---

### Task 6: Componentes do relatório e CSS de impressão

**Files:**
- Create: `src/modules/reports/components/report-sheet.tsx`, `report-parts.tsx`, `report-toolbar.tsx`
- Modify: `src/app/globals.css` (bloco `@media print` do relatório)

**Interfaces:**
- Produces (server components, sem estado):
  - `ReportSheet({ kind, title, subtitle, figure, figureLabel, stamp, children })` → `<article aria-labelledby>` com cabeçalho (tipo em `font-mono text-signal-strong`, `h1`, subtítulo, número grande à direita) e `Stamp` no fim.
  - `ReportSection({ n, title, aside?, children })` → `<section aria-labelledby>` com `h2` "01 Título".
  - `Stamp({ cells: { k: string; v: string }[] })` → grade de 5 colunas no estilo do carimbo.
  - `Figures({ items: { k: string; v: ReactNode; d?: string; tone?: "danger" | "warning" }[] })` → números em linha separados por réguas.
  - `PhaseRuler({ phases: PhaseProgress[] })`, `StatusStack({ counts: Record<DeliverableStatus, number> })` (barra com `role="img"` e `aria-label` com as contagens), `MiniBar({ percent, band? })`.
  - `ReportToolbar({ csvHref, note })` → texto + `<a download href={csvHref}>Baixar CSV</a>` + `PrintButton` (importado de `@/modules/meetings/components/share-toggle`), com `print:hidden`.
- Classes: tokens do tema (`bg-card`, `border-border`, `border-strong`, `text-muted-foreground`, `text-faint`, `text-signal-strong`, `bg-link`, `bg-success`, `bg-danger`, `bg-warning`, `bg-subtle`, `font-mono`, `tabular-nums`). Visual segue `docs/mockups/relatorio.css`.
- `globals.css`:

```css
@media print {
  @page { size: A4; margin: 12mm; }
  .report-sheet { border: 0 !important; }
  .report-sheet section, .report-sheet .report-stamp { break-inside: avoid; }
  /* A4 tem ~720px: mantém o layout de mesa. */
  .report-sheet .report-figures { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
  .report-sheet .report-phase { grid-template-columns: 150px 1fr 90px !important; }
  .report-sheet .report-cols { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
}
```

- [ ] **Step 1:** implementar os componentes. **Step 2:** `npm run typecheck && npm run lint` limpos. **Step 3:** Commit `Relatórios: folha, seções, carimbo e impressão`.

---

### Task 7: Páginas e rotas de CSV

**Files:**
- Create: as 8 rotas listadas em File Structure.
- Modify: `(admin)/layout.tsx` (item `{ href: "/admin/relatorios", label: "Relatórios" }` depois de "Atas"), `admin/projetos/[id]/_components/tabs.tsx` (aba "Relatório" depois de "Financeiro", `match: p.startsWith(\`${base}/relatorio\`)`), `portal/projetos/[id]/_components/tabs.tsx` (aba "Relatório").

Conteúdo:
- **`/admin/projetos/[id]/relatorio`**: `requireAdmin` → `loadProjectStatus` (null → `notFound()`) → `buildProjectStatus(input, todayInSaoPaulo())`. Seções 01–07 como no mockup `admin-projeto-relatorio.html`. Textos de vazio: sem entregas → "Nenhuma entrega cadastrada."; sem marcos → "Nenhum marco cadastrado."; sem atrasadas/bloqueadas → "Nenhuma entrega atrasada ou bloqueada."; sem atas → "Nenhuma ata registrada neste projeto."; lançamentos sem valor/hora → "N lançamentos sem valor/hora". Sem orçamento → "sem orçamento". Carimbo: Projeto, Cliente, Emitido em (`DD/MM/AAAA HH:mm` em Brasília), Versão `interna`, Emitente `EGD Consultoria & Tecnologia`. `metadata.title = "Relatório"`.
- **`/admin/projetos/[id]/relatorio/csv`** (`GET`): `requireAdmin` → `loadProjectStatus` (null → `new Response("Projeto não encontrado", { status: 404 })`) → `projectStatusCsv` → `csvResponse(reportFilename(slug, today), toCsv(...))`.
- **`/admin/relatorios/layout.tsx`**: `PageHeader title="Relatórios"` + abas Portfólio (`/admin/relatorios`) | Semanal (`/admin/relatorios/semanal`) (client component de abas no mesmo estilo de `ProjectTabs`).
- **`/admin/relatorios`**: `loadPortfolioData` → `buildPortfolio`. Tabela como no mockup; nome do projeto linka `/admin/projetos/{id}/relatorio`. Vazio: "Nenhum projeto em andamento. Projetos entregues e cancelados não entram no portfólio." Título: "N projetos em andamento" (singular "1 projeto em andamento").
- **`/admin/relatorios/csv`**: `portfolioCsv` → arquivo `relatorio-portfolio-<hoje>.csv`.
- **`/admin/relatorios/semanal`**: `searchParams.semana` → `parseWeekParam` → `buildWeekly`. Navegação: links para `?semana=<monday-7>`, `?semana=<monday+7>` e `/admin/relatorios/semanal` ("Esta semana"). Vazio: "Nada concluído, vencendo ou atrasado nesta semana."
- **`/admin/relatorios/semanal/csv`**: mesma normalização → `relatorio-semanal-<label>.csv`.
- **`/portal/projetos/[id]/relatorio`**: `requirePortal` → `loadClientReport` (null → `notFound()`) → `buildClientReport`. Seções como no mockup `portal-projeto-relatorio.html`; atas linkam `/portal/atas/{id}`; carimbo com Versão `cliente`.
- **`/portal/projetos/[id]/relatorio/csv`**: `requirePortal` → 404 se null → `clientReportCsv`.

- [ ] **Step 1:** implementar. **Step 2:** `npm run typecheck && npm run lint && npm run build`. **Step 3:** subir `npm run start` e validar no Playwright contra os mockups (tela 1440 px, celular 390 px e PDF A4 de cada relatório); corrigir divergências. **Step 4:** Commit `Relatórios: páginas, CSV e navegação`.

---

### Task 8: E2E, acessibilidade e console

**Files:**
- Create: `tests/e2e/relatorios.spec.ts`
- Modify: `tests/e2e/acessibilidade.spec.ts`, `tests/e2e/console-limpo.spec.ts` (acrescentar `/admin/relatorios`, `/admin/relatorios/semanal`, `/admin/projetos/${p.id}/relatorio` e `/portal/projetos/${p.id}/relatorio`)

`relatorios.spec.ts` (usa `createTwoOrgsWithClientsAndFiles`, `loginAs`, `ADMIN`):

```ts
import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("relatórios do admin: status, portfólio, semanal e CSVs", async ({ page }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  await loginAs(page, ADMIN.email, ADMIN.password);

  await page.goto(`/admin/projetos/${fx.projectA.id}`);
  await page.getByRole("link", { name: "Relatório", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: fx.projectA.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: /progresso por fase/i })).toBeVisible();
  await expect(page.getByText(fx.projectA.hiddenTitle)).toBeVisible(); // admin vê tudo
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /baixar csv/i }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^relatorio-.+-\d{4}-\d{2}-\d{2}\.csv$/);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("link", { name: /baixar csv/i })).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("link", { name: "Relatórios", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/relatorios$/);
  await expect(page.getByRole("link", { name: fx.projectA.title })).toBeVisible();

  await page.getByRole("link", { name: "Semanal" }).click();
  const label = await page.getByTestId("semana-rotulo").textContent();
  await page.getByRole("link", { name: /semana anterior/i }).click();
  await expect(page.getByTestId("semana-rotulo")).not.toHaveText(label ?? "");
  await page.getByRole("link", { name: /esta semana/i }).click();
  await expect(page.getByTestId("semana-rotulo")).toHaveText(label ?? "");
});

test("relatório do cliente: sem valores, sem entrega interna; outra organização recebe 404", async ({ browser }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto(`/portal/projetos/${fx.projectA.id}`);
  await page.getByRole("link", { name: "Relatório", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: fx.projectA.title })).toBeVisible();
  await expect(page.getByText(fx.projectA.visible.title)).toBeVisible();
  await expect(page.getByText(fx.projectA.hiddenTitle)).toHaveCount(0);
  await expect(page.getByText(/R\$/)).toHaveCount(0);
  await expect(page.getByText("Em espera").first()).toBeVisible(); // a fixture tem uma entrega bloqueada visível
  const res = await page.request.get(`/portal/projetos/${fx.projectA.id}/relatorio/csv`);
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).not.toContain(fx.projectA.hiddenTitle);
  expect(body).toContain(fx.projectA.visible.title);

  const other = await browser.newContext();
  const op = await other.newPage();
  await loginAs(op, fx.clientB.email, fx.clientB.password);
  expect((await op.goto(`/portal/projetos/${fx.projectA.id}/relatorio`))?.status()).toBe(404);
  expect((await op.request.get(`/portal/projetos/${fx.projectA.id}/relatorio/csv`)).status()).toBe(404);
  await Promise.all([ctx.close(), other.close()]);
});
```

(O rótulo da semana na página leva `data-testid="semana-rotulo"`.)

- [ ] **Step 1:** escrever os testes. **Step 2:** `npm run build && npm run start` + `E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/relatorios.spec.ts tests/e2e/acessibilidade.spec.ts tests/e2e/console-limpo.spec.ts` → PASS (corrigir o que o axe apontar). **Step 3:** Commit `Relatórios: E2E, acessibilidade e console`.

---

### Task 9: Ocultar os cases do site público

**Files:**
- Modify: `src/content/site.ts` — `export const SHOW_CASES = false;` (comentário: "Cases fora do site até o dono decidir o conteúdo; o admin e a API continuam."), `NAV_LINKS` e `FOOTER_COLUMNS` filtram `/cases` quando `!SHOW_CASES`.
- Modify: `src/components/legacy/navbar.tsx` (mesmo filtro no `NAV_LINKS` local), `src/components/legacy/footer.tsx` (link condicionado), `src/app/(site)/page.tsx` (faixa `brand-proof` inteira condicionada; sem `SHOW_CASES` não chama `getSiteCases`), `src/app/(site)/sobre/page.tsx` (bloco `hero-meta` condicionado), `src/app/(site)/produtos/page.tsx` ("Ver caso real" condicionado), `src/app/(site)/cases/page.tsx` (`if (!SHOW_CASES) notFound();` e `generateMetadata`/`metadata` mantidos), `src/app/sitemap.ts` (sem `/cases`), `src/app/(admin)/admin/cases/page.tsx` (meta: "… O site público está com os cases ocultos por enquanto (SHOW_CASES).").
- Modify tests: `tests/e2e/site.spec.ts`, `tests/e2e/seo.spec.ts`, `tests/e2e/acessibilidade.spec.ts` (remover `/cases` das listas); `tests/e2e/cases.spec.ts` (parte pública: `/cases` responde 404 e a home não mostra "Conheça os cases"; o CRUD no admin continua testado); unit de SEO/sitemap, se houver asserção com `/cases` (`grep -rn "/cases" tests/unit`).

- [ ] **Step 1:** ajustar testes (falham). **Step 2:** implementar. **Step 3:** unit + E2E de site/SEO/cases verdes; screenshot da home 1440 px e 390 px sem a faixa. **Step 4:** Commit `Site: oculta os cases até retomarmos o conteúdo`.

---

### Task 10: Verificação completa, integração e deploy

- [ ] `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build` e a suíte E2E inteira contra `npm run start` → tudo verde (mesma sequência do CI).
- [ ] Revisão do branch inteiro (reviewer no modelo mais capaz) e correções.
- [ ] Runbook: seção nova em `docs/runbooks/coolify.md` sobre a tag da imagem (`main`) e o reinício dos containers da EGD para reemitir certificados; spec das Fases 10–12 com status "implementado".
- [ ] Merge de `fase-12-relatorios` (contém `fase-11-atas`) na `main` com `--no-ff`, push; CI verde na `main` e imagem `:main` publicada.
- [ ] Coolify: conferir variáveis de ambiente de produção contra `src/lib/env.ts` (as fases 2–12 podem ter acrescentado variáveis), trocar a imagem de `fase-1-fundacao` para `main`, deploy; migrations 0001–0010 aplicadas pelo entrypoint; `https://egdsystem.com.br/api/health` 200; smoke test em produção (site sem cases, login, `/admin/relatorios`).
