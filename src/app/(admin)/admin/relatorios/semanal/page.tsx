import Link from "next/link";
import { requireAdmin } from "@/modules/auth/context";
import { loadPortfolioData } from "@/modules/reports/queries";
import { buildWeekly, type WeeklyItem } from "@/modules/reports/build";
import { addDays, formatBr, formatBrShort, parseWeekParam, todayInSaoPaulo } from "@/modules/reports/dates";
import { EmptyLine, ReportSection, ReportSheet } from "@/modules/reports/components/report-sheet";
import { ReportToolbar } from "@/modules/reports/components/report-toolbar";
import { issuedAt } from "@/modules/reports/components/report-bits";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Relatórios · Semanal" };

const nav = buttonVariants({ variant: "secondary", size: "sm" });

function Column({ title, items, empty }: { title: string; items: WeeklyItem[]; empty: string }) {
  return (
    <div>
      <h4 className="mb-1.5 border-b border-border pb-1.5 text-[0.8125rem] font-medium text-muted-foreground">
        {title} ({items.length})
      </h4>
      {items.length === 0 ? (
        <p className="text-[0.8125rem] text-faint">{empty}</p>
      ) : (
        <ul className="text-sm">
          {items.map((i, n) => (
            <li key={`${i.kind}-${i.title}-${n}`} className="flex justify-between gap-2.5 py-1">
              <span>
                {i.kind === "milestone" && <span role="img" aria-label="marco" className="mr-1.5 align-[1px] text-[9px] text-signal-strong">◆</span>}
                {i.title}
              </span>
              {i.daysLate !== null ? (
                <span className="font-mono text-[0.8125rem] whitespace-nowrap text-danger">{i.daysLate} d</span>
              ) : (
                <span className="font-mono text-[0.8125rem] whitespace-nowrap text-faint">{formatBrShort(i.date)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function SemanalPage({ searchParams }: PageProps<"/admin/relatorios/semanal">) {
  const ctx = await requireAdmin();
  const today = todayInSaoPaulo();
  const monday = parseWeekParam((await searchParams).semana, today);
  const w = buildWeekly(await loadPortfolioData(ctx, { includeClosed: true }), monday, today);
  const periodo = `${formatBrShort(w.start)} – ${formatBr(w.end)}`;
  const semanaAtual = parseWeekParam(undefined, today) === monday;

  return (
    <>
      <ReportToolbar csvHref={`/admin/relatorios/semanal/csv?semana=${monday}`}>
        <nav aria-label="Semana" className="flex flex-wrap items-center gap-2">
          <Link className={nav} aria-label="Semana anterior" href={`/admin/relatorios/semanal?semana=${addDays(monday, -7)}`}>
            ←
          </Link>
          <span data-testid="semana-rotulo" className="px-2 font-mono text-sm">{periodo}</span>
          <Link className={nav} aria-label="Próxima semana" href={`/admin/relatorios/semanal?semana=${addDays(monday, 7)}`}>
            →
          </Link>
          {!semanaAtual && (
            <Link className={nav} href="/admin/relatorios/semanal">
              Esta semana
            </Link>
          )}
        </nav>
      </ReportToolbar>
      <ReportSheet
        kind={`RELATÓRIO SEMANAL · SEMANA ${Number(w.label.slice(6))} DE ${w.label.slice(0, 4)}`}
        title={`${formatBrShort(w.start)} a ${formatBr(w.end)}`}
        subtitle={`Concluído na semana, o que vence de ${formatBrShort(w.nextStart)} a ${formatBrShort(w.nextEnd)} e o que segue atrasado`}
        figure={w.doneCount}
        figureLabel={w.doneCount === 1 ? "entrega ou marco concluído" : "entregas e marcos concluídos"}
        stamp={[
          { k: "Relatório", v: `Semanal · ${w.label}` },
          { k: "Período", v: `${formatBrShort(w.start)} – ${formatBr(w.end)}` },
          { k: "Emitido em", v: issuedAt() },
          { k: "Versão", v: "interna" },
          { k: "Emitente", v: "EGD Consultoria & Tecnologia" },
        ]}
      >
        <ReportSection n={1} title="Por projeto" aside="só projetos com movimento">
          {w.projects.length === 0 ? (
            <EmptyLine>Nada concluído, vencendo ou atrasado nesta semana.</EmptyLine>
          ) : (
            w.projects.map((p, i) => (
              <div key={p.id} className={i === 0 ? "" : "mt-5 border-t border-strong pt-4"}>
                <h3 className="flex flex-wrap items-baseline gap-2.5 font-semibold">
                  <Link href={`/admin/projetos/${p.id}/relatorio`} className="hover:text-link">{p.title}</Link>
                  <small className="text-[0.8125rem] font-normal text-faint">{p.companyName}</small>
                </h3>
                <div className="report-cols mt-2.5 grid gap-5 md:grid-cols-3">
                  <Column title="Concluído" items={p.done} empty="nada concluído" />
                  <Column title={`Vence de ${formatBrShort(w.nextStart)} a ${formatBrShort(w.nextEnd)}`} items={p.due} empty="nada vence" />
                  <Column title="Atrasado" items={p.late} empty="nada atrasado" />
                </div>
              </div>
            ))
          )}
        </ReportSection>
      </ReportSheet>
    </>
  );
}
