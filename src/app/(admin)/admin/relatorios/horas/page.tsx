import { requireOwner } from "@/modules/auth/context";
import { listHoursByPerson, listTeamMembers, listProjects } from "@/modules/projects/queries";
import { buildHoursReport } from "@/modules/reports/hours";
import { formatHours } from "@/modules/projects/burndown";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { isIsoDate } from "@/lib/iso-date";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatBrlCents } from "@/lib/format";

export const metadata = { title: "Relatórios · Horas" };

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function HorasPage({ searchParams }: PageProps<"/admin/relatorios/horas">) {
  const ctx = await requireOwner();
  const sp = await searchParams;
  const today = todayInSaoPaulo();
  const from = isIsoDate(str(sp.de)) ? str(sp.de) : `${today.slice(0, 7)}-01`;
  const to = isIsoDate(str(sp.ate)) ? str(sp.ate) : today;
  const userId = str(sp.pessoa);
  const projectId = str(sp.projeto);
  const [rows, team, projects] = await Promise.all([listHoursByPerson(ctx, { from, to, userId, projectId }), listTeamMembers(ctx), listProjects(ctx, {})]);
  const r = buildHoursReport(rows);
  const qs = new URLSearchParams({ de: from, ate: to, ...(userId ? { pessoa: userId } : {}), ...(projectId ? { projeto: projectId } : {}) }).toString();
  return (
    <>
      <PageHeader title="Horas por pessoa" meta="Entradas fechadas no período, com o custo pelo rate congelado em cada entrada. Para o fechamento do mês." />
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-1">
          <label htmlFor="de" className="type-micro text-muted-foreground">De</label>
          <input id="de" name="de" type="date" defaultValue={from} className="h-9 rounded-sm border border-input bg-card px-2 text-sm" />
        </div>
        <div className="grid gap-1">
          <label htmlFor="ate" className="type-micro text-muted-foreground">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={to} className="h-9 rounded-sm border border-input bg-card px-2 text-sm" />
        </div>
        <div className="grid gap-1">
          <label htmlFor="pessoa" className="type-micro text-muted-foreground">Pessoa</label>
          <select id="pessoa" name="pessoa" defaultValue={userId} className="h-9 rounded-sm border border-input bg-card px-2 text-sm">
            <option value="">Todas</option>
            {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="projeto" className="type-micro text-muted-foreground">Projeto</label>
          <select id="projeto" name="projeto" defaultValue={projectId} className="h-9 max-w-[16rem] rounded-sm border border-input bg-card px-2 text-sm">
            <option value="">Todos</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">Filtrar</Button>
        <Button size="sm" variant="secondary" render={<a href={`/admin/relatorios/horas/csv?${qs}`} />}>Baixar CSV</Button>
      </form>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          { l: "Horas", v: formatHours(r.totalMinutes) },
          { l: "Custo", v: formatBrlCents(r.totalCostCents) },
          { l: "Entradas sem rate", v: String(r.entriesWithoutRate) },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border border-border bg-card px-5 py-4">
            <div className="text-sm font-medium text-muted-foreground">{k.l}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>
      <Block title="Por pessoa e projeto" padded={false}>
        {r.people.length === 0 ? (
          <EmptyState title="Nenhuma hora no período." text="Só entram entradas fechadas (timer parado ou apontamento manual)." />
        ) : (
          <div tabIndex={0} role="region" aria-label="Horas por pessoa e projeto, role horizontalmente se necessário" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-muted-foreground">
              <tr className="text-left">
                <th className="h-10 px-4 font-medium">Pessoa</th>
                <th className="h-10 px-4 font-medium">Projeto</th>
                <th className="h-10 px-4 text-right font-medium">Horas</th>
                <th className="h-10 px-4 text-right font-medium">Custo</th>
              </tr>
            </thead>
            <tbody>
              {r.people.map((p) => (
                <>
                  {p.projects.map((row, i) => (
                    <tr key={`${p.userId}-${row.projectId}`} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{i === 0 ? p.userName : ""}</td>
                      <td className="px-4 py-2">{row.projectTitle}</td>
                      <td className="type-data px-4 py-2 text-right">{formatHours(row.minutes)}</td>
                      <td className="type-data px-4 py-2 text-right">{formatBrlCents(row.costCents)}{row.entriesWithoutRate ? <span className="ml-1 text-warning" title="entradas sem rate">*</span> : null}</td>
                    </tr>
                  ))}
                  <tr key={`${p.userId}-total`} className="border-t border-border bg-subtle/60">
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-muted-foreground">Total de {p.userName}</td>
                    <td className="type-data px-4 py-2 text-right font-medium">{formatHours(p.minutes)}</td>
                    <td className="type-data px-4 py-2 text-right font-medium">{formatBrlCents(p.costCents)}</td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Block>
    </>
  );
}
