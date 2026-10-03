import { requireOwner } from "@/modules/auth/context";
import { loadForecastInput } from "@/modules/crm/queries";
import { buildForecast, STAGE_LABEL, STAGE_PROBABILITY } from "@/modules/crm/forecast";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatBrlCents } from "@/lib/format";

export const metadata = { title: "CRM · Previsão" };

const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
const monthLabel = (ym: string) => MONTH.format(new Date(`${ym}-01T00:00:00Z`)).replace(".", "");
const th = "h-10 px-4 font-medium";
const td = "px-4 py-2";

export default async function PrevisaoPage() {
  const ctx = await requireOwner();
  const today = todayInSaoPaulo();
  const f = buildForecast(await loadForecastInput(ctx), today);
  return (
    <>
      <PageHeader
        title="Previsão e conversão"
        meta="Pipeline aberto ponderado pela probabilidade de cada estágio, esperado por mês de fechamento e taxa de conversão."
        actions={<Button size="sm" variant="secondary" render={<a href="/admin/crm/previsao/csv" />}>Baixar CSV</Button>}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { l: "Oportunidades abertas", v: String(f.openCount) },
          { l: "Valor em aberto", v: formatBrlCents(f.openCents) },
          { l: "Previsão ponderada", v: formatBrlCents(f.weightedCents) },
          { l: "Conversão (90 dias)", v: f.conversion[0].rate === null ? "—" : `${f.conversion[0].rate}%` },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border border-border bg-card px-5 py-4">
            <div className="text-sm font-medium text-muted-foreground">{k.l}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Block title="Pipeline por estágio" aside="probabilidade fixa por estágio" padded={false}>
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-muted-foreground"><tr><th className={th}>Estágio</th><th className={`${th} text-right`}>Qtd.</th><th className={`${th} text-right`}>Valor</th><th className={`${th} text-right`}>Prob.</th><th className={`${th} text-right`}>Ponderado</th></tr></thead>
            <tbody>
              {f.byStage.map((s) => (
                <tr key={s.stage} className="border-t border-border"><td className={td}>{STAGE_LABEL[s.stage]}</td><td className={`${td} type-data text-right`}>{s.count}</td><td className={`${td} type-data text-right`}>{formatBrlCents(s.valueCents)}</td><td className={`${td} type-data text-right`}>{Math.round(STAGE_PROBABILITY[s.stage] * 100)}%</td><td className={`${td} type-data text-right`}>{formatBrlCents(s.weightedCents)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-border bg-subtle font-medium"><td className={td}>Total</td><td className={`${td} type-data text-right`}>{f.openCount}</td><td className={`${td} type-data text-right`}>{formatBrlCents(f.openCents)}</td><td /><td className={`${td} type-data text-right`}>{formatBrlCents(f.weightedCents)}</td></tr></tfoot>
          </table>
        </Block>
        <Block title="Esperado por mês de fechamento" aside="próximos 6 meses · vencidas no mês corrente" padded={false}>
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-muted-foreground"><tr><th className={th}>Mês</th><th className={`${th} text-right`}>Qtd.</th><th className={`${th} text-right`}>Valor</th><th className={`${th} text-right`}>Ponderado</th></tr></thead>
            <tbody>
              {f.byMonth.map((m) => (
                <tr key={m.month} className="border-t border-border"><td className={td}>{monthLabel(m.month)}</td><td className={`${td} type-data text-right`}>{m.count}</td><td className={`${td} type-data text-right`}>{formatBrlCents(m.valueCents)}</td><td className={`${td} type-data text-right`}>{formatBrlCents(m.weightedCents)}</td></tr>
              ))}
              <tr className="border-t border-border text-muted-foreground"><td className={td}>Sem data prevista</td><td className={`${td} type-data text-right`}>{f.noDate.count}</td><td className={td} /><td className={`${td} type-data text-right`}>{formatBrlCents(f.noDate.weightedCents)}</td></tr>
            </tbody>
          </table>
        </Block>
        <Block title="Conversão" aside="ganhas ÷ (ganhas + perdidas)" padded={false}>
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-muted-foreground"><tr><th className={th}>Janela</th><th className={`${th} text-right`}>Ganhas</th><th className={`${th} text-right`}>Perdidas</th><th className={`${th} text-right`}>Taxa</th><th className={`${th} text-right`}>Ticket médio</th><th className={`${th} text-right`}>Ciclo médio</th></tr></thead>
            <tbody>
              {f.conversion.map((c) => (
                <tr key={c.window} className="border-t border-border"><td className={td}>{c.window} dias</td><td className={`${td} type-data text-right`}>{c.won}</td><td className={`${td} type-data text-right`}>{c.lost}</td><td className={`${td} type-data text-right`}>{c.rate === null ? "—" : `${c.rate}%`}</td><td className={`${td} type-data text-right`}>{formatBrlCents(c.avgTicketCents)}</td><td className={`${td} type-data text-right`}>{c.avgCycleDays === null ? "—" : `${c.avgCycleDays} dias`}</td></tr>
              ))}
            </tbody>
          </table>
        </Block>
        <Block title="Motivos de perda" aside="mais comuns" padded={false}>
          {f.lostReasons.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma oportunidade perdida registrada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {f.lostReasons.map((r) => (
                <li key={r.reason} className="flex items-center justify-between px-5 py-2.5 text-sm"><span>{r.reason}</span><span className="type-data text-muted-foreground">{r.count}</span></li>
              ))}
            </ul>
          )}
        </Block>
      </div>
    </>
  );
}
