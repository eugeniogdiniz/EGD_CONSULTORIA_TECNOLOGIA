/**
 * E-mails das automações (Fase 13). Funções puras sobre os resultados dos
 * builders; mesmo `layout()` dos transacionais, todo valor dinâmico por `esc`.
 */
import { esc, layout, type MailContent } from "./templates";
import { PRIORITY_LABEL } from "@/modules/projects/priority";
import { formatBr, formatBrShort } from "@/modules/reports/dates";
import type { DailyDigest, DigestLine, DigestSection } from "@/modules/jobs/digests/daily";
import type { WeeklyReport } from "@/modules/reports/build";
import type { ClientDigest } from "@/modules/jobs/digests/weekly-client";

const H2 = "font-size:13px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.04em;color:#555";
const TABLE = "border-collapse:collapse;width:100%;font-size:14px";
/** Tabelas de listagem curtas, sem cabeçalho: para leitores de tela viram texto corrido. */
const TABLE_OPEN = `<table role="presentation" style="${TABLE}">`;
const TD = "padding:4px 8px 4px 0;vertical-align:top;border-bottom:1px solid #eee";
const LATE = "color:#b42318;font-weight:600";
const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);
const diasUteis = (n: number) => (n === 1 ? "1 dia útil" : `${n} dias úteis`);
const weekdayName = (iso: string) => WEEKDAY[new Date(`${iso}T00:00:00Z`).getUTCDay()];
const mark = (l: { kind: "deliverable" | "milestone"; title: string }) => (l.kind === "milestone" ? `◆ ${l.title}` : l.title);
const more = (s: DigestSection<unknown>) => (s.more > 0 ? `<p style="font-size:13px;color:#666;margin:4px 0 0">e mais ${s.more}.</p>` : "");
const moreText = (s: DigestSection<unknown>) => (s.more > 0 ? [`  … e mais ${s.more}.`] : []);
const tr = (cells: string[]) => `<tr>${cells.map((c) => `<td style="${TD}">${c}</td>`).join("")}</tr>`;

function linesTable(s: DigestSection<DigestLine>, mode: "late" | "today" | "upcoming") {
  const rows = s.items.map((l) =>
    tr([
      ...(mode === "upcoming" ? [formatBrShort(l.dueAt)] : []),
      esc(l.projectTitle),
      esc(mark(l)),
      l.priority ? PRIORITY_LABEL[l.priority].toLowerCase() : l.kind === "milestone" ? "marco" : "",
      ...(mode === "late" ? [`<span style="${LATE}">${dias(l.daysLate)}</span>`] : []),
      l.assigneeName ? esc(l.assigneeName) : "",
    ]),
  );
  return `${TABLE_OPEN}${rows.join("")}</table>${more(s)}`;
}
const linesText = (s: DigestSection<DigestLine>, mode: "late" | "today" | "upcoming") => [
  ...s.items.map((l) => {
    const bits = [l.projectTitle, mark(l)];
    if (mode === "upcoming") bits.unshift(formatBrShort(l.dueAt));
    if (l.priority) bits.push(PRIORITY_LABEL[l.priority].toLowerCase());
    if (mode === "late") bits.push(`${dias(l.daysLate)} de atraso`);
    if (l.assigneeName) bits.push(l.assigneeName);
    return `  - ${bits.join(" · ")}`;
  }),
  ...moreText(s),
];

export function renderDailyDigest(d: DailyDigest, baseUrl: string): MailContent {
  const title = `Resumo de ${weekdayName(d.today)}, ${formatBr(d.today)}`;
  const html: string[] = [];
  const text: string[] = [title, ""];
  const sec = (label: string, count: number) => `<h2 style="${H2}">${esc(label)} (${count})</h2>`;

  if (d.late.total) {
    html.push(sec("Atrasadas", d.late.total), linesTable(d.late, "late"));
    text.push(`ATRASADAS (${d.late.total})`, ...linesText(d.late, "late"), "");
  }
  if (d.dueToday.total) {
    html.push(sec("Vencem hoje", d.dueToday.total), linesTable(d.dueToday, "today"));
    text.push(`VENCEM HOJE (${d.dueToday.total})`, ...linesText(d.dueToday, "today"), "");
  }
  if (d.upcoming.total) {
    html.push(sec("Próximos 7 dias", d.upcoming.total), linesTable(d.upcoming, "upcoming"));
    text.push(`PRÓXIMOS 7 DIAS (${d.upcoming.total})`, ...linesText(d.upcoming, "upcoming"), "");
  }
  if (d.requests.total) {
    html.push(
      sec("Solicitações aguardando a equipe", d.requests.total),
      `${TABLE_OPEN}${d.requests.items.map((r) => tr([esc(r.organizationName), `<a href="${esc(`${baseUrl}/admin/solicitacoes/${r.id}`)}">${esc(r.title)}</a>`, `<span style="${r.businessDays >= 2 ? LATE : ""}">há ${diasUteis(r.businessDays)}</span>`, r.slaBreached ? `<span style="${LATE}">⚠ SLA</span>` : ""])).join("")}</table>${more(d.requests)}`,
    );
    text.push(`SOLICITAÇÕES AGUARDANDO A EQUIPE (${d.requests.total})`, ...d.requests.items.map((r) => `  - ${r.organizationName} · ${r.title} · há ${diasUteis(r.businessDays)}${r.slaBreached ? " · SLA estourado" : ""} · ${baseUrl}/admin/solicitacoes/${r.id}`), ...moreText(d.requests), "");
  }
  if (d.expiring.total || d.expired.total) {
    const rows = [
      ...d.expiring.items.map((p) => tr([esc(p.number), `${esc(p.title)} — ${esc(p.companyName)}`, p.daysLeft === 0 ? "vence hoje" : `vence em ${dias(p.daysLeft)} (${formatBrShort(p.validUntil)})`])),
      ...d.expired.items.map((p) => tr([esc(p.number), `${esc(p.title)} — ${esc(p.companyName)}`, `<span style="${LATE}">expirada em ${formatBrShort(p.expiredOn)}</span>`])),
    ];
    html.push(`<h2 style="${H2}">Propostas</h2>${TABLE_OPEN}${rows.join("")}</table>`);
    text.push(
      "PROPOSTAS",
      ...d.expiring.items.map((p) => `  - ${p.number} · ${p.title} — ${p.companyName} · ${p.daysLeft === 0 ? "vence hoje" : `vence em ${dias(p.daysLeft)} (${formatBrShort(p.validUntil)})`}`),
      ...d.expired.items.map((p) => `  - ${p.number} · ${p.title} — ${p.companyName} · expirada em ${formatBrShort(p.expiredOn)}`),
      "",
    );
  }
  if (d.urgentCount) {
    html.push(`<p style="margin-top:20px">Demandas urgentes em aberto: <strong>${d.urgentCount}</strong>.</p>`);
    text.push(`Demandas urgentes em aberto: ${d.urgentCount}.`, "");
  }
  html.push(
    `<p style="margin-top:20px;font-size:13px">Abrir: <a href="${esc(`${baseUrl}/admin/demandas`)}">demandas</a> · <a href="${esc(`${baseUrl}/admin/solicitacoes`)}">solicitações</a> · <a href="${esc(`${baseUrl}/admin/crm/propostas`)}">propostas</a></p>`,
  );
  if (d.overdueInvoices.total > 0 || d.dueInvoices.total > 0) {
    const brl = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
    html.push(sec("Financeiro", d.overdueInvoices.total + d.dueInvoices.total));
    if (d.overdueInvoices.total > 0) {
      html.push(`${TABLE_OPEN}${d.overdueInvoices.items.map((i) => tr([esc(i.projectTitle), `<a href="${esc(`${baseUrl}/admin/projetos/${i.projectId}/financeiro`)}">#${i.number} ${esc(i.description)}</a>`, brl(i.amountCents), `<span style="${LATE}">vencida há ${dias(i.daysLate)}</span>`])).join("")}</table>${more(d.overdueInvoices)}`);
      text.push(`PARCELAS VENCIDAS (${d.overdueInvoices.total})`, ...d.overdueInvoices.items.map((i) => `  - ${i.projectTitle} · #${i.number} ${i.description} · ${brl(i.amountCents)} · vencida há ${dias(i.daysLate)}`), ...moreText(d.overdueInvoices), "");
    }
    if (d.dueInvoices.total > 0) {
      html.push(`<p style="font-size:13px;margin:8px 0 4px;color:#555">Vencem nos próximos 7 dias</p>${TABLE_OPEN}${d.dueInvoices.items.map((i) => tr([formatBrShort(i.dueAt), esc(i.projectTitle), `#${i.number} ${esc(i.description)}`, brl(i.amountCents)])).join("")}</table>${more(d.dueInvoices)}`);
      text.push(`PARCELAS QUE VENCEM EM 7 DIAS (${d.dueInvoices.total})`, ...d.dueInvoices.items.map((i) => `  - ${formatBrShort(i.dueAt)} · ${i.projectTitle} · #${i.number} ${i.description} · ${brl(i.amountCents)}`), ...moreText(d.dueInvoices), "");
    }
  }
  text.push(`Demandas: ${baseUrl}/admin/demandas`, `Solicitações: ${baseUrl}/admin/solicitacoes`, `Propostas: ${baseUrl}/admin/crm/propostas`);
  return { subject: d.subject, text: text.join("\n"), html: layout(title, html.join("\n")) };
}

export function renderWeeklyTeam(r: WeeklyReport, baseUrl: string): MailContent {
  const due = r.projects.reduce((s, p) => s + p.due.length, 0);
  const late = r.projects.reduce((s, p) => s + p.late.length, 0);
  const subject = `Semana ${r.label}: ${r.doneCount} concluído${r.doneCount === 1 ? "" : "s"}, ${due} ${due === 1 ? "vence" : "vencem"}, ${late} atrasado${late === 1 ? "" : "s"}`;
  const title = `Semana ${r.label} · ${formatBrShort(r.start)} a ${formatBr(r.end)}`;
  const url = `${baseUrl}/admin/relatorios/semanal?semana=${r.start}`;
  const html: string[] = [`<p style="color:#555;font-size:14px">Concluído na semana, o que vence de ${formatBrShort(r.nextStart)} a ${formatBrShort(r.nextEnd)} e o que segue atrasado.</p>`];
  const text: string[] = [title, ""];
  if (r.projects.length === 0) {
    html.push(`<p>Nenhuma entrega ou marco concluído, vencendo ou atrasado nesta semana.</p>`);
    text.push("Nenhuma entrega ou marco concluído, vencendo ou atrasado nesta semana.", "");
  }
  for (const p of r.projects) {
    html.push(`<h2 style="${H2}">${esc(p.title)} <span style="font-weight:normal;text-transform:none;letter-spacing:0">· ${esc(p.companyName)}</span></h2>`);
    text.push(`${p.title.toUpperCase()} · ${p.companyName}`);
    const group = (label: string, items: typeof p.done, lateStyle = false) => {
      if (!items.length) return;
      html.push(
        `<p style="margin:6px 0 2px;font-size:13px;color:#666">${label}</p>${TABLE_OPEN}${items.map((i) => tr([formatBrShort(i.date), esc(mark(i)), lateStyle && i.daysLate ? `<span style="${LATE}">${dias(i.daysLate)}</span>` : ""])).join("")}</table>`,
      );
      text.push(`  ${label}:`, ...items.map((i) => `    - ${formatBrShort(i.date)} · ${mark(i)}${lateStyle && i.daysLate ? ` · ${dias(i.daysLate)} de atraso` : ""}`));
    };
    group("Concluído", p.done);
    group("Vence", p.due);
    group("Atrasado", p.late, true);
    text.push("");
  }
  html.push(`<p style="margin-top:20px;font-size:13px"><a href="${esc(url)}">Abrir no sistema</a></p>`);
  text.push(`Abrir no sistema: ${url}`);
  return { subject, text: text.join("\n"), html: layout(title, html.join("\n")) };
}

export function renderWeeklyClient(d: ClientDigest, baseUrl: string): MailContent {
  const title = `Andamento dos seus projetos · ${formatBrShort(d.thisStart)} a ${formatBr(d.thisEnd)}`;
  const html: string[] = [`<p>Olá! Este é o resumo semanal dos projetos da <strong>${esc(d.organizationName)}</strong> com a EGD.</p>`];
  const text: string[] = [title, "", `Resumo semanal dos projetos da ${d.organizationName} com a EGD.`, ""];
  for (const p of d.projects) {
    if (p.done.length + p.due.length === 0) continue;
    const pct = p.percent === null ? "" : ` · ${p.percent}% concluído`;
    html.push(`<h2 style="${H2}">${esc(p.title)}<span style="font-weight:normal;text-transform:none;letter-spacing:0">${pct}</span></h2>`);
    text.push(`${p.title.toUpperCase()}${pct}`);
    const group = (label: string, items: typeof p.done) => {
      if (!items.length) return;
      html.push(`<p style="margin:6px 0 2px;font-size:13px;color:#666">${label}</p>${TABLE_OPEN}${items.map((i) => tr([formatBrShort(i.date), esc(mark(i))])).join("")}</table>`);
      text.push(`  ${label}:`, ...items.map((i) => `    - ${formatBrShort(i.date)} · ${mark(i)}`));
    };
    group("Concluído na semana passada", p.done);
    group("Previsto para esta semana", p.due);
    const url = `${baseUrl}/portal/projetos/${p.id}/relatorio`;
    html.push(`<p style="font-size:13px;margin:6px 0 0"><a href="${esc(url)}">Relatório do projeto</a></p>`);
    text.push(`  Relatório: ${url}`, "");
  }
  if (d.awaiting.length) {
    html.push(`<h2 style="${H2}">Solicitações aguardando você</h2>${TABLE_OPEN}${d.awaiting.map((r) => tr([`<a href="${esc(`${baseUrl}/portal/solicitacoes/${r.id}`)}">${esc(r.title)}</a>`])).join("")}</table>`);
    text.push("SOLICITAÇÕES AGUARDANDO VOCÊ", ...d.awaiting.map((r) => `  - ${r.title} · ${baseUrl}/portal/solicitacoes/${r.id}`), "");
  }
  html.push(`<p style="margin-top:24px;font-size:12px;color:#666">Você recebe este resumo porque ele está ligado em Minha conta no portal (${esc(`${baseUrl}/portal/conta`)}).</p>`);
  text.push(`Você recebe este resumo porque ele está ligado em Minha conta no portal: ${baseUrl}/portal/conta`);
  return { subject: d.subject, text: text.join("\n"), html: layout(title, html.join("\n")) };
}
