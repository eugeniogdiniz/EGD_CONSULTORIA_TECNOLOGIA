import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listBacklog, listProjectsForFilter, listTeamMembers, type BacklogItem } from "@/modules/projects/queries";
import { isPriority, PRIORITIES, PRIORITY_LABEL, PRIORITY_STYLE } from "@/modules/projects/priority";
import { PrioritySelect } from "@/modules/projects/components/priority-select";
import { todayInSaoPaulo } from "@/modules/dashboard/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatIsoDate } from "@/lib/format";

export const metadata = { title: "Demandas" };

const STATUS_LABEL: Record<string, string> = { todo: "A fazer", doing: "Em progresso", review: "Revisão", done: "Feita", blocked: "Bloqueada" };
const STATUS_ORDER = ["todo", "doing", "review", "blocked"] as const;

type Status = "todo" | "doing" | "review" | "done" | "blocked";
const isStatus = (v: string): v is Status => v in STATUS_LABEL;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

function Chip({ p }: { p: keyof typeof PRIORITY_LABEL }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", PRIORITY_STYLE[p])}>
      {PRIORITY_LABEL[p]}
    </span>
  );
}

function DueDate({ item }: { item: BacklogItem }) {
  return (
    <span className={cn("type-data text-xs", item.overdue ? "font-medium text-danger" : "text-muted-foreground")}>
      {item.dueAt ? formatIsoDate(item.dueAt) : "—"}
      {item.overdue && " · atrasada"}
    </span>
  );
}

export default async function DemandasPage({ searchParams }: PageProps<"/admin/demandas">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const today = todayInSaoPaulo();

  const projectId = str(sp.projeto);
  const assignee = str(sp.responsavel);
  const priority = str(sp.prioridade);
  const status = str(sp.status);
  const overdueOnly = str(sp.atrasadas) === "1";
  const board = str(sp.vista) === "quadro";

  const [items, projects, team] = await Promise.all([
    listBacklog(ctx, {
      projectId: projectId || undefined,
      assigneeId: assignee || undefined,
      priority: isPriority(priority) ? priority : undefined,
      status: isStatus(status) ? status : undefined,
      overdueOnly,
      today,
    }),
    listProjectsForFilter(ctx),
    listTeamMembers(ctx),
  ]);

  const counts = {
    total: items.length,
    urgent: items.filter((i) => i.priority === "urgent").length,
    overdue: items.filter((i) => i.overdue).length,
    unassigned: items.filter((i) => !i.assigneeId).length,
  };
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ projeto: projectId, responsavel: assignee, prioridade: priority, status, atrasadas: overdueOnly ? "1" : "", ...extra })) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/demandas${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Demandas"
        meta="Tudo que está em aberto nos projetos, da maior para a menor prioridade."
        actions={<div className="flex items-center gap-2">
          <Link
            href={qs({ responsavel: assignee === ctx.user.id ? "" : ctx.user.id })}
            aria-current={assignee === ctx.user.id ? "true" : undefined}
            className={cn("inline-flex h-[34px] items-center rounded-sm border border-input px-3 text-sm", assignee === ctx.user.id ? "bg-link-soft font-medium text-link" : "text-muted-foreground hover:bg-muted")}
          >
            Minhas
          </Link>
          <div role="group" aria-label="Vista" className="inline-flex overflow-hidden rounded-sm border border-input">
            {[{ k: "", l: "Lista" }, { k: "quadro", l: "Quadro" }].map((v) => (
              <Link
                key={v.k}
                href={qs({ vista: v.k })}
                aria-current={(board ? "quadro" : "") === v.k ? "true" : undefined}
                className={cn("px-3 py-1.5 text-sm", (board ? "quadro" : "") === v.k ? "bg-link-soft font-medium text-link" : "text-muted-foreground hover:bg-muted")}
              >
                {v.l}
              </Link>
            ))}
          </div></div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { l: "Em aberto", v: counts.total, tone: "" },
          { l: "Urgentes", v: counts.urgent, tone: counts.urgent > 0 ? "text-danger" : "" },
          { l: "Atrasadas", v: counts.overdue, tone: counts.overdue > 0 ? "text-danger" : "" },
          { l: "Sem responsável", v: counts.unassigned, tone: "" },
        ].map((c) => (
          <div key={c.l} className="rounded-lg border border-border bg-card px-5 py-4">
            <div className="text-sm font-medium text-muted-foreground">{c.l}</div>
            <div className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", c.tone)}>{c.v}</div>
          </div>
        ))}
      </div>

      <form action="/admin/demandas" className="flex flex-wrap items-end gap-3">
        {board && <input type="hidden" name="vista" value="quadro" />}
        <label className="grid gap-1 text-xs text-muted-foreground">
          Projeto
          <select name="projeto" defaultValue={projectId} className="h-9 rounded-sm border border-input bg-card px-2 text-sm text-foreground">
            <option value="">Todos</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Responsável
          <select name="responsavel" defaultValue={assignee} className="h-9 rounded-sm border border-input bg-card px-2 text-sm text-foreground">
            <option value="">Todos</option>
            <option value="none">Sem responsável</option>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Prioridade
          <select name="prioridade" defaultValue={priority} className="h-9 rounded-sm border border-input bg-card px-2 text-sm text-foreground">
            <option value="">Todas</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Status
          <select name="status" defaultValue={status} className="h-9 rounded-sm border border-input bg-card px-2 text-sm text-foreground">
            <option value="">Abertos</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="inline-flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="atrasadas" value="1" defaultChecked={overdueOnly} /> Só atrasadas
        </label>
        <Button type="submit" size="sm" variant="outline">Filtrar</Button>
        {(projectId || assignee || priority || status || overdueOnly) && (
          <Link href={qs({ projeto: "", responsavel: "", prioridade: "", status: "", atrasadas: "" })} className="type-micro pb-2 text-link hover:underline">limpar</Link>
        )}
      </form>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState title="Nenhuma demanda com esses filtros." text="Entregas em aberto dos projetos ativos aparecem aqui, priorizadas." />
        </div>
      ) : board ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_ORDER.map((st) => {
            const col = items.filter((i) => i.status === st);
            return (
              <section key={st} data-status={st} className="rounded-md border border-border bg-paper p-2">
                <h2 className="flex items-center justify-between px-1 py-1.5 text-sm font-semibold">
                  {STATUS_LABEL[st]} <span className="type-data text-xs font-normal text-muted-foreground">{col.length}</span>
                </h2>
                <ul className="grid gap-2">
                  {col.map((i) => (
                    <li key={i.id}>
                      <Link href={`/admin/projetos/${i.projectId}/entregas/${i.id}`} className="grid gap-1.5 rounded border border-border bg-card p-3 hover:border-strong">
                        <span className="text-sm font-medium leading-snug">{i.title}</span>
                        <span className="type-micro text-muted-foreground">{i.projectTitle}</span>
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <Chip p={i.priority} />
                          <DueDate item={i} />
                        </span>
                        <span className="type-micro text-faint">{i.assigneeName ?? "Sem responsável"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div tabIndex={0} role="region" aria-label="Demandas, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Prioridade</th>
                <th className="h-10 px-4 font-medium">Demanda</th>
                <th className="h-10 px-4 font-medium">Responsável</th>
                <th className="h-10 px-4 font-medium">Prazo</th>
                <th className="h-10 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5">
                    <PrioritySelect id={i.id} projectId={i.projectId} value={i.priority} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/projetos/${i.projectId}/entregas/${i.id}`} className="font-medium hover:text-link">{i.title}</Link>
                    <div className="type-micro text-muted-foreground">
                      {i.projectTitle} · {i.companyName}{i.phaseName ? ` · ${i.phaseName}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{i.assigneeName ?? <span className="text-faint">—</span>}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><DueDate item={i} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{STATUS_LABEL[i.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
