import Link from "next/link";
import { requireOwner } from "@/modules/auth/context";
import { loadPortfolioData, loadSnapshotsUpTo } from "@/modules/reports/queries";
import { buildPortfolio, deltaLabel, portfolioDelta } from "@/modules/reports/build";
import { addDays, formatBrShort, todayInSaoPaulo } from "@/modules/reports/dates";
import { PROJECT_STATUS_ADMIN_LABEL } from "@/modules/reports/labels";
import { EmptyLine, ReportSection, ReportSheet } from "@/modules/reports/components/report-sheet";
import { MiniBar } from "@/modules/reports/components/report-parts";
import { ReportToolbar } from "@/modules/reports/components/report-toolbar";
import { issuedAt } from "@/modules/reports/components/report-bits";
import { csvDecimal } from "@/modules/reports/csv";
import { cn } from "cn";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Relatórios · Portfólio" };

const th = "pb-2 pr-3 text-left text-[0.8125rem] font-medium whitespace-nowrap text-faint";
const td = "py-2.5 pr-3 align-top";
const STATUS_DOT: Record<string, string> = { active: "bg-success", on_hold: "bg-warning", planning: "bg-faint" };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function PortfolioPage() {
  const ctx = await requireOwner();
  const today = todayInSaoPaulo();
  const [data, snapshots] = await Promise.all([loadPortfolioData(ctx), loadSnapshotsUpTo(addDays(today, -7))]);
  const r = buildPortfolio(data, today);
  const total = r.rows.length;
  const delta = (id: string) => portfolioDelta(r.rows.find((x) => x.id === id)!, snapshots.get(id));

  return (
    <>
      <PageHeader title="Portfólio de projetos" meta={'Projetos em planejamento, ativos e pausados. O relatório de cada projeto fica na aba "Relatório" dele.'} />
      <ReportToolbar csvHref="/admin/relatorios/csv" note="Imprime em A4; o CSV traz os mesmos números." />
      <ReportSheet
        kind="PORTFÓLIO DE PROJETOS"
        title={total === 1 ? "1 projeto em andamento" : `${total} projetos em andamento`}
        subtitle={[
          plural(r.counts.active, "ativo", "ativos"),
          plural(r.counts.on_hold, "pausado", "pausados"),
          `${r.counts.planning} em planejamento`,
        ].join(" · ")}
        figure={r.overdueTotal}
        figureTone={r.overdueTotal > 0 ? "danger" : undefined}
        figureLabel={r.overdueTotal === 1 ? "entrega atrasada no total" : "entregas atrasadas no total"}
        stamp={[
          { k: "Relatório", v: "Portfólio" },
          { k: "Escopo", v: "projetos não arquivados" },
          { k: "Emitido em", v: issuedAt() },
          { k: "Versão", v: "interna" },
          { k: "Emitente", v: "EGD Consultoria & Tecnologia" },
        ]}
      >
        <ReportSection n={1} title="Projetos" aside="ordenados por atrasadas, depois por prazo">
          {total === 0 ? (
            <EmptyLine>Nenhum projeto em andamento. Projetos entregues e cancelados não entram no portfólio.</EmptyLine>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-strong">
                    <tr>
                      <th className={th}>Projeto</th><th className={th}>Status</th><th className={th}>Progresso</th><th className={th}>Próximo marco</th>
                      <th className={cn(th, "text-right")}>Atrasadas</th><th className={cn(th, "text-right")}>Δ 7 dias</th><th className={cn(th, "text-right")}>Bloqueadas</th><th className={cn(th, "text-right")}>Horas</th><th className={th}>Orçamento consumido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {r.rows.map((p) => (
                      <tr key={p.id}>
                        <td className={td}>
                          <Link href={`/admin/projetos/${p.id}/relatorio`} className="font-medium text-link hover:underline">{p.title}</Link>
                          <span className="block text-[0.8125rem] text-faint">{p.companyName}</span>
                        </td>
                        <td className={cn(td, "whitespace-nowrap")}>
                          <span className="inline-flex items-center gap-2"><i aria-hidden className={cn("inline-block size-2 rounded-full", STATUS_DOT[p.status])} />{PROJECT_STATUS_ADMIN_LABEL[p.status]}</span>
                        </td>
                        <td className={cn(td, "whitespace-nowrap")}>
                          {p.percent === null ? (
                            <span className="text-faint">sem entregas</span>
                          ) : (
                            <><MiniBar percent={p.percent} label={`${p.percent}% concluído`} /><span className="font-mono text-[0.8125rem]">{p.percent}%</span></>
                          )}
                        </td>
                        <td className={td}>
                          {p.nextMilestone ? (
                            <>{p.nextMilestone.name}<span className="block font-mono text-[0.8125rem] text-faint">{formatBrShort(p.nextMilestone.dueAt)}</span></>
                          ) : (
                            <span className="text-faint">sem marco pendente</span>
                          )}
                        </td>
                        <td className={cn(td, "text-right tabular-nums", p.overdue > 0 && "font-semibold text-danger")}>{p.overdue}</td>
                        <td className={cn(td, "text-right font-mono text-[0.8125rem] whitespace-nowrap")} data-testid="delta">
                          {(() => {
                            const d = delta(p.id);
                            if (d.overdue === null) return <span className="text-faint" title="sem foto de 7 dias atrás">—</span>;
                            return (
                              <>
                                <span className={cn(d.overdue > 0 && "text-danger", d.overdue < 0 && "text-success")}>{deltaLabel(d.overdue)} atras.</span>
                                <span className={cn("block", (d.progress ?? 0) > 0 && "text-success")}>{deltaLabel(d.progress)} pp</span>
                              </>
                            );
                          })()}
                        </td>
                        <td className={cn(td, "text-right tabular-nums")}>{p.blocked}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{csvDecimal(p.minutes / 60, 1)}</td>
                        <td className={cn(td, "whitespace-nowrap")}>
                          {p.consumption === null ? (
                            <span className="text-faint">sem orçamento</span>
                          ) : (
                            <>
                              <MiniBar percent={p.consumption} band={p.band} label={`${p.consumption}% do orçamento`} />
                              <span className={cn("font-mono text-[0.8125rem]", p.band === "alert" && "text-danger")}>{p.consumption}%</span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2.5 text-[0.8125rem] text-faint">
                Orçamento consumido = (custo de horas + despesas) ÷ orçamento. Acima de 90% fica em vermelho; de 70% a 90%, em amarelo.
                Δ 7 dias compara atrasadas e progresso (pontos percentuais) com a foto diária de uma semana atrás.
              </p>
            </>
          )}
        </ReportSection>
      </ReportSheet>
    </>
  );
}
