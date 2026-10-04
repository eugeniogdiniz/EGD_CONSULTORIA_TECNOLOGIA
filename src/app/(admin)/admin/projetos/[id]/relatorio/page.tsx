import { notFound } from "next/navigation";
import { requireOwner } from "@/modules/auth/context";
import { loadProjectStatus } from "@/modules/reports/queries";
import { buildProjectStatus } from "@/modules/reports/build";
import { formatBr, formatMinutes, todayInSaoPaulo } from "@/modules/reports/dates";
import { ADMIN_STATUS_LABEL, PROJECT_STATUS_ADMIN_LABEL, milestoneText } from "@/modules/reports/labels";
import { EmptyLine, Figures, ReportSection, ReportSheet } from "@/modules/reports/components/report-sheet";
import { LateTag, PhaseRuler, StatusStack } from "@/modules/reports/components/report-parts";
import { ReportToolbar } from "@/modules/reports/components/report-toolbar";
import { MilestoneStatus, issuedAt, meetingSummary } from "@/modules/reports/components/report-bits";
import { PRIORITY_LABEL, PRIORITY_STYLE } from "@/modules/projects/priority";
import { formatBrlCents } from "@/lib/format";
import { cn } from "cn";

export const metadata = { title: "Relatório" };

const th = "pb-2 pr-3 text-left text-[0.8125rem] font-medium whitespace-nowrap text-faint";
const td = "py-2.5 pr-3 align-top";

export default async function RelatorioProjetoPage({ params }: PageProps<"/admin/projetos/[id]/relatorio">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const data = await loadProjectStatus(ctx, id);
  if (!data) notFound();
  const today = todayInSaoPaulo();
  const { input } = data;
  const r = buildProjectStatus(input, today);
  const p = input.project;
  const next = r.nextMilestone;

  return (
    <>
      <ReportToolbar csvHref={`/admin/projetos/${id}/relatorio/csv`} note="Dados de agora. Imprima ou salve como PDF para enviar." />
      <ReportSheet
        kind="RELATÓRIO DE STATUS"
        title={p.title}
        subtitle={[
          p.companyName,
          p.startedAt && `início ${formatBr(p.startedAt)}`,
          p.endedAt && `término ${formatBr(p.endedAt)}`,
          `responsável ${p.ownerName}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        figure={r.progress.percent === null ? "—" : <>{r.progress.percent}<small className="text-xl font-medium text-muted-foreground">%</small></>}
        figureLabel={r.progress.total === 0 ? "sem entregas" : `${r.progress.done} de ${r.progress.total} entregas concluídas`}
        stamp={[
          { k: "Projeto", v: p.title },
          { k: "Cliente", v: p.companyName },
          { k: "Emitido em", v: issuedAt() },
          { k: "Versão", v: "interna" },
          { k: "Emitente", v: "EGD Consultoria & Tecnologia" },
        ]}
      >
        <ReportSection n={1} title="Resumo">
          <Figures
            items={[
              { k: "Status", v: PROJECT_STATUS_ADMIN_LABEL[p.status] ?? p.status, small: true, d: p.startedAt ? `desde ${formatBr(p.startedAt)}` : undefined },
              { k: "Atrasadas", v: r.overdueCount, tone: r.overdueCount > 0 ? "danger" : undefined, d: "entregas com prazo vencido" },
              { k: "Bloqueadas", v: r.blockedCount, tone: r.blockedCount > 0 ? "warning" : undefined, d: "entregas paradas" },
              {
                k: "Próximo marco",
                v: next ? next.name : "nenhum pendente",
                small: true,
                d: next ? `${formatBr(next.dueAt)} · ${milestoneText(next)}` : undefined,
              },
            ]}
          />
        </ReportSection>

        <ReportSection n={2} title="Progresso por fase">
          {r.phases.length === 0 ? <EmptyLine>Nenhuma fase cadastrada.</EmptyLine> : <PhaseRuler phases={r.phases} />}
        </ReportSection>

        <ReportSection n={3} title="Entregas por status" aside={`${r.progress.total} no total`}>
          {r.progress.total === 0 ? <EmptyLine>Nenhuma entrega cadastrada.</EmptyLine> : <StatusStack counts={r.byStatus} labels={ADMIN_STATUS_LABEL} />}
        </ReportSection>

        <ReportSection n={4} title="Atrasadas e bloqueadas">
          {r.issues.length === 0 ? (
            <EmptyLine>Nenhuma entrega atrasada ou bloqueada.</EmptyLine>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-strong">
                  <tr><th className={th}>Entrega</th><th className={th}>Fase</th><th className={th}>Prioridade</th><th className={th}>Responsável</th><th className={th}>Prazo</th><th className={th}>Situação</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.issues.map((x) => (
                    <tr key={x.id}>
                      <td className={td}>{x.title}</td>
                      <td className={td}>{x.phaseName ?? "Sem fase"}</td>
                      <td className={td}><span className={cn("inline-flex rounded-sm border px-1.5 font-mono text-[0.75rem]", PRIORITY_STYLE[x.priority])}>{PRIORITY_LABEL[x.priority].toLowerCase()}</span></td>
                      <td className={td}>{x.assigneeName ?? "—"}</td>
                      <td className={cn(td, "font-mono text-[0.8125rem] whitespace-nowrap")}>{formatBr(x.dueAt) || "—"}</td>
                      <td className={td}>
                        {x.daysLate !== null && <LateTag days={x.daysLate} />}
                        {x.status === "blocked" && <span className={cn("inline-flex rounded-sm bg-danger-soft px-2 text-[0.8125rem] text-danger", x.daysLate !== null && "ml-2")}>bloqueada</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>

        <ReportSection n={5} title="Marcos">
          {r.milestones.length === 0 ? (
            <EmptyLine>Nenhum marco cadastrado.</EmptyLine>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-strong">
                  <tr><th className={th}>Marco</th><th className={th}>Fase</th><th className={th}>Previsto</th><th className={th}>Situação</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.milestones.map((m) => (
                    <tr key={m.id}>
                      <td className={td}>{m.name}</td>
                      <td className={td}>{m.phaseName ?? "—"}</td>
                      <td className={cn(td, "font-mono text-[0.8125rem] whitespace-nowrap")}>{formatBr(m.dueAt)}</td>
                      <td className={td}><MilestoneStatus m={m} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>

        <ReportSection n={6} title="Horas e custo">
          <Figures
            items={[
              { k: "Horas lançadas", v: formatMinutes(r.money.minutes), d: `${r.money.entriesCount} ${r.money.entriesCount === 1 ? "lançamento" : "lançamentos"}` },
              {
                k: "Custo de horas",
                v: formatBrlCents(r.money.laborCents),
                d: r.money.entriesWithoutRate > 0 ? `${r.money.entriesWithoutRate} sem valor/hora` : "todos com valor/hora",
              },
              { k: "Despesas", v: formatBrlCents(r.money.expenseCents) },
              {
                k: "Consumo do orçamento",
                v: r.money.consumption === null ? "sem orçamento" : `${r.money.consumption}%`,
                small: r.money.consumption === null,
                tone: r.money.band === "alert" ? "danger" : r.money.band === "warn" ? "warning" : undefined,
                d: r.money.budgetCents ? `${formatBrlCents(r.money.costCents)} de ${formatBrlCents(r.money.budgetCents)}` : undefined,
              },
            ]}
          />
          <p className="mt-2.5 text-[0.8125rem] text-faint">Custo de horas = minutos × valor/hora de cada pessoa. Lançamentos sem valor/hora contam horas, mas não custo.</p>
        </ReportSection>

        <ReportSection n={7} title="Últimas atas">
          {r.meetings.length === 0 ? (
            <EmptyLine>Nenhuma ata registrada neste projeto.</EmptyLine>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-strong">
                  <tr><th className={th}>Data</th><th className={th}>Reunião</th><th className={th}>Decisões</th><th className={th}>Compartilhada</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.meetings.map((m) => (
                    <tr key={m.id}>
                      <td className={cn(td, "font-mono text-[0.8125rem] whitespace-nowrap")}>{meetingSummary(m).date}</td>
                      <td className={td}><a className="text-link hover:underline" href={`/admin/atas/${m.id}`}>{m.title}</a></td>
                      <td className={td}>{meetingSummary(m).decisions}</td>
                      <td className={td}>{m.sharedWithClient ? "sim" : "não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>
      </ReportSheet>
    </>
  );
}
