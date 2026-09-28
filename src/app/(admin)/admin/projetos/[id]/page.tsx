import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import {
  getProject,
  listMilestones,
  listPhasesWithCounts,
  upcomingDeliverables,
} from "@/modules/projects/queries";
import {
  changeProjectStatusForm,
  deleteMilestoneForm,
  deletePhaseForm,
  movePhaseForm,
  toggleMilestoneCompletedForm,
  toggleProjectArchivedForm,
} from "@/modules/projects/form-actions";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { PhaseFormDialog } from "@/modules/projects/components/phase-form";
import { MilestoneFormDialog } from "@/modules/projects/components/milestone-form";
import { formatBrlCents, formatDate, formatIsoDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  active: "Em execução",
  on_hold: "Em espera",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  planning: "border-border bg-subtle text-muted-foreground",
  active: "border-link bg-link-soft text-link",
  on_hold: "border-warning bg-warning-soft text-warning",
  delivered: "border-success bg-success-soft text-success",
  cancelled: "border-danger bg-danger-soft text-danger",
};

const STATUS_TRANSITIONS = ["planning", "active", "on_hold", "delivered", "cancelled"] as const;

export default async function ProjetoDetalhePage({ params }: PageProps<"/admin/projetos/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const row = await getProject(ctx, id);
  if (!row) notFound();
  const p = row.project;

  const [phases, milestones, upcoming] = await Promise.all([
    listPhasesWithCounts(ctx, id),
    listMilestones(ctx, id),
    upcomingDeliverables(ctx, id, 5),
  ]);

  const archived = Boolean(p.archivedAt);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title={p.title}
        meta={
          <>
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-sm border px-2 text-[0.75rem] font-medium",
                STATUS_STYLE[p.status],
              )}
            >
              {STATUS_LABEL[p.status]}
            </span>
            <span className="text-faint"> · </span>
            <Link href={`/admin/crm/empresas/${row.company.id}`} className="text-link hover:underline">
              {row.company.name}
            </Link>
            {p.startedAt && (
              <>
                <span className="text-faint"> · </span>
                iniciado {formatIsoDate(p.startedAt)}
              </>
            )}
            {p.endedAt && (
              <>
                <span className="text-faint"> · </span>
                encerrado {formatIsoDate(p.endedAt)}
              </>
            )}
            {archived && (
              <>
                <span className="text-faint"> · </span>
                <span className="inline-flex items-center rounded-sm border border-border px-1.5 py-0.5 text-xs">arquivado</span>
              </>
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" render={<Link href={`/admin/projetos/${p.id}/editar`} />}>
              Editar
            </Button>
            <form action={toggleProjectArchivedForm}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="archived" value={archived ? "1" : "0"} />
              <Button type="submit" variant={archived ? "outline" : "destructive"} size="sm">
                {archived ? "Desarquivar" : "Arquivar"}
              </Button>
            </form>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_TRANSITIONS.filter((s) => s !== p.status).map((to) => (
          <form key={to} action={changeProjectStatusForm} className="contents">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="to" value={to} />
            <Button type="submit" variant="outline" size="sm">→ {STATUS_LABEL[to]}</Button>
          </form>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-6">
          <Block
            title="Fases"
            aside={
              <PhaseFormDialog
                projectId={p.id}
                trigger={<Button variant="secondary" size="sm" type="button">Nova fase</Button>}
              />
            }
          >
            {phases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fase ainda. Adicione a primeira pra começar a estruturar o projeto.</p>
            ) : (
              <ul className="grid gap-2">
                {phases.map((phase, i) => (
                  <li key={phase.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-3">
                      <span className="type-data text-faint">{String(i + 1).padStart(2, "0")}</span>
                      <h4 className="text-sm font-semibold">{phase.name}</h4>
                      <div className="ml-auto flex items-center gap-1">
                        <form action={movePhaseForm} className="contents">
                          <input type="hidden" name="id" value={phase.id} />
                          <input type="hidden" name="projectId" value={p.id} />
                          <input type="hidden" name="direction" value="up" />
                          <Button type="submit" variant="outline" size="icon-xs" disabled={i === 0} aria-label="Subir">↑</Button>
                        </form>
                        <form action={movePhaseForm} className="contents">
                          <input type="hidden" name="id" value={phase.id} />
                          <input type="hidden" name="projectId" value={p.id} />
                          <input type="hidden" name="direction" value="down" />
                          <Button type="submit" variant="outline" size="icon-xs" disabled={i === phases.length - 1} aria-label="Descer">↓</Button>
                        </form>
                        <PhaseFormDialog
                          projectId={p.id}
                          phase={{ id: phase.id, name: phase.name, startedAt: phase.startedAt, endedAt: phase.endedAt, notes: phase.notes }}
                          trigger={<button type="button" className="ml-1 text-xs text-link hover:underline">Editar</button>}
                        />
                        <form action={deletePhaseForm} className="contents">
                          <input type="hidden" name="id" value={phase.id} />
                          <input type="hidden" name="projectId" value={p.id} />
                          <button type="submit" className="text-xs text-danger hover:underline" disabled={phase.deliverableCount > 0} title={phase.deliverableCount > 0 ? "Mova as entregas antes" : ""}>Excluir</button>
                        </form>
                      </div>
                    </div>
                    <div className="type-data mt-1 text-xs text-muted-foreground">
                      {formatIsoDate(phase.startedAt)} → {formatIsoDate(phase.endedAt)}
                    </div>
                    <div className="type-micro mt-1 text-muted-foreground">
                      {phase.deliverableCount} entregas · {phase.milestoneCount} marcos
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block
            title="Marcos"
            aside={
              <MilestoneFormDialog
                projectId={p.id}
                phases={phases.map((ph) => ({ id: ph.id, name: ph.name }))}
                trigger={<Button variant="secondary" size="sm" type="button">Novo marco</Button>}
              />
            }
          >
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum marco. Marcos são checkpoints com data (reuniões, aprovações, entregas de fase).</p>
            ) : (
              <ul className="grid gap-1">
                {milestones.map((m) => {
                  const done = Boolean(m.completedAt);
                  const late = !done && m.dueAt <= today;
                  return (
                    <li key={m.id} className="grid grid-cols-[24px_100px_1fr_auto_auto] items-center gap-3 py-1.5 text-sm">
                      <form action={toggleMilestoneCompletedForm} className="contents">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="projectId" value={p.id} />
                        <input type="hidden" name="completed" value={done ? "1" : "0"} />
                        <button type="submit" aria-label={done ? "Descompletar" : "Concluir"} className={cn("h-4 w-4 rounded-sm border", done ? "border-success bg-success" : "border-border")}>
                          {done ? <span className="text-card">✓</span> : null}
                        </button>
                      </form>
                      <span className={cn("type-data text-xs", done ? "text-muted-foreground line-through" : late ? "text-danger font-medium" : "text-muted-foreground")}>
                        {formatIsoDate(m.dueAt)}
                      </span>
                      <span className={cn(done && "text-muted-foreground line-through")}>{m.name}</span>
                      <span className="type-micro text-muted-foreground">{m.phaseName ?? "sem fase"}</span>
                      <form action={deleteMilestoneForm} className="contents">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="projectId" value={p.id} />
                        <button type="submit" className="type-micro text-danger hover:underline">Excluir</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>

          <Block
            title="Próximas entregas"
            aside={<Link href={`/admin/projetos/${p.id}/kanban`} className="text-sm text-link hover:underline">Ver kanban</Link>}
          >
            {upcoming.length === 0 ? (
              <EmptyState title="Nenhuma entrega aberta." text="Abra o kanban para adicionar entregas ao projeto." />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((d) => (
                  <li key={d.id} className="grid grid-cols-[1fr_100px_100px] items-center gap-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{d.title}</div>
                      <div className="type-micro text-muted-foreground">{d.phaseName ?? "sem fase"}{d.assigneeName ? ` · ${d.assigneeName}` : ""}</div>
                    </div>
                    <div className={cn("type-data text-xs text-right", d.dueAt && d.dueAt <= today && "text-danger font-medium")}>{formatIsoDate(d.dueAt)}</div>
                    <div className="type-micro text-right text-muted-foreground">{d.status}</div>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <div className="flex flex-col gap-6">
          <Block title="Dados">
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Valor snapshot</dt>
              <dd className="type-data">{formatBrlCents(p.budgetCents)}</dd>
              <dt className="text-muted-foreground">Moeda</dt>
              <dd className="type-data">{p.currency}</dd>
              <dt className="text-muted-foreground">Owner</dt>
              <dd>{row.owner.name}</dd>
              <dt className="text-muted-foreground">Criado em</dt>
              <dd className="type-data">{formatDate(p.createdAt)}</dd>
              <dt className="text-muted-foreground">Empresa</dt>
              <dd><Link href={`/admin/crm/empresas/${row.company.id}`} className="text-link hover:underline">{row.company.name}</Link></dd>
              <dt className="text-muted-foreground">Oportunidade</dt>
              <dd><Link href={`/admin/crm/oportunidades/${row.opportunity.id}`} className="text-link hover:underline">{row.opportunity.title}</Link></dd>
            </dl>
          </Block>

          {p.notes && (
            <Block title="Notas">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{p.notes}</p>
            </Block>
          )}
        </div>
      </div>
    </>
  );
}
