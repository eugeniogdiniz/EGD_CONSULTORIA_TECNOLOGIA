import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortal } from "@/modules/auth/context";
import { loadClientReport } from "@/modules/reports/portal-queries";
import { buildClientReport } from "@/modules/reports/build";
import { formatBr, formatMinutes, todayInSaoPaulo } from "@/modules/reports/dates";
import { EmptyLine, Figures, ReportSection, ReportSheet } from "@/modules/reports/components/report-sheet";
import { PhaseRuler } from "@/modules/reports/components/report-parts";
import { ReportToolbar } from "@/modules/reports/components/report-toolbar";
import { MilestoneStatus, issuedAt, meetingSummary } from "@/modules/reports/components/report-bits";
import { cn } from "cn";

export const metadata = { title: "Relatório" };

const th = "pb-2 pr-3 text-left text-[0.8125rem] font-medium whitespace-nowrap text-faint";
const td = "py-2.5 pr-3 align-top";

export default async function PortalRelatorioPage({ params }: PageProps<"/portal/projetos/[id]/relatorio">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const data = await loadClientReport(ctx, id);
  if (!data) notFound();
  const { input } = data;
  const r = buildClientReport(input, todayInSaoPaulo());
  const p = input.project;
  let n = 0;

  return (
    <>
      <ReportToolbar csvHref={`/portal/projetos/${id}/relatorio/csv`} note="Situação do projeto hoje. Você pode imprimir ou salvar em PDF." />
      <ReportSheet
        kind="RELATÓRIO DE ANDAMENTO"
        title={p.title}
        subtitle={[
          p.startedAt && `início ${formatBr(p.startedAt)}`,
          p.endedAt && `término ${formatBr(p.endedAt)}`,
          `responsável EGD: ${p.ownerName}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        figure={r.progress.percent === null ? "—" : <>{r.progress.percent}<small className="text-xl font-medium text-muted-foreground">%</small></>}
        figureLabel={r.progress.total === 0 ? "nenhuma entrega compartilhada ainda" : `${r.progress.done} de ${r.progress.total} entregas concluídas`}
        stamp={[
          { k: "Projeto", v: p.title },
          { k: "Cliente", v: p.companyName },
          { k: "Emitido em", v: issuedAt() },
          { k: "Versão", v: "cliente" },
          { k: "Emitente", v: "EGD Consultoria & Tecnologia" },
        ]}
      >
        <ReportSection n={++n} title="Progresso por fase">
          {r.phases.length === 0 ? <EmptyLine>O cronograma por fases ainda não foi definido.</EmptyLine> : <PhaseRuler phases={r.phases} />}
        </ReportSection>

        <ReportSection n={++n} title="Marcos">
          {r.milestones.length === 0 ? (
            <EmptyLine>Nenhum marco definido.</EmptyLine>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-strong">
                  <tr><th className={th}>Marco</th><th className={th}>Previsto</th><th className={th}>Situação</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.milestones.map((m) => (
                    <tr key={m.id}>
                      <td className={td}>{m.name}</td>
                      <td className={cn(td, "font-mono text-[0.8125rem] whitespace-nowrap")}>{formatBr(m.dueAt)}</td>
                      <td className={td}><MilestoneStatus m={m} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>

        <ReportSection n={++n} title="Em andamento e próximas entregas">
          {r.open.length === 0 ? (
            <EmptyLine>{r.progress.total === 0 ? "Nenhuma entrega compartilhada ainda." : "Todas as entregas compartilhadas estão concluídas."}</EmptyLine>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-strong">
                  <tr><th className={th}>Entrega</th><th className={th}>Fase</th><th className={th}>Status</th><th className={th}>Prazo</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.open.map((x) => (
                    <tr key={x.id}>
                      <td className={td}><Link href={`/portal/projetos/${id}/entregas/${x.id}`} className="hover:text-link">{x.title}</Link></td>
                      <td className={td}>{x.phaseName ?? "—"}</td>
                      <td className={td}>
                        {x.blocked ? <span className="inline-flex rounded-sm bg-warning-soft px-2 text-[0.8125rem] text-warning">{x.statusLabel}</span> : x.statusLabel}
                      </td>
                      <td className={cn(td, "font-mono text-[0.8125rem] whitespace-nowrap")}>
                        {formatBr(x.dueAt) || "—"}
                        {x.late && <span className="text-danger"> · atrasada</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>

        {r.hours && (
          <ReportSection n={++n} title="Horas dedicadas">
            <Figures
              items={[
                { k: "Total", v: formatMinutes(r.hours.totalMinutes) },
                ...r.hours.byPhase.slice(0, 3).map((ph) => ({ k: ph.name, v: formatMinutes(ph.minutes) })),
              ]}
            />
            {r.hours.byPhase.length > 3 && (
              <ul className="mt-2.5 text-sm text-muted-foreground">
                {r.hours.byPhase.slice(3).map((ph) => (
                  <li key={ph.name}>{ph.name}: {formatMinutes(ph.minutes)}</li>
                ))}
              </ul>
            )}
          </ReportSection>
        )}

        <ReportSection n={++n} title="Atas compartilhadas">
          {r.meetings.length === 0 ? (
            <EmptyLine>Nenhuma ata compartilhada neste projeto.</EmptyLine>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-strong">
                  <tr><th className={th}>Data</th><th className={th}>Reunião</th><th className={th}>Decisões</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.meetings.map((m) => (
                    <tr key={m.id}>
                      <td className={cn(td, "font-mono text-[0.8125rem] whitespace-nowrap")}>{meetingSummary(m).date}</td>
                      <td className={td}><Link href={`/portal/atas/${m.id}`} className="text-link hover:underline">{m.title}</Link></td>
                      <td className={td}>{meetingSummary(m).decisions}</td>
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
