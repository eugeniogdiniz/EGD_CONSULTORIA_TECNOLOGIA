import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import {
  getCurrentUserRateCents,
  getDeliverable,
  getOpenTimer,
  getProject,
  listComments,
  listDeliverables,
  listPhases,
  listPredecessors,
  listSuccessors,
  listTimeEntries,
} from "@/modules/projects/queries";
import { deleteTimeEntryForm, setDeliverableVisibilityForm } from "@/modules/projects/form-actions";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DeliverableFormDialog } from "@/modules/projects/components/deliverable-form";
import { TimerPanel, ManualTimeForm } from "@/modules/projects/components/timer-panel";
import { CommentThread } from "@/modules/projects/components/comment-thread";
import { DependencyPicker } from "@/modules/projects/components/dependency-picker";
import { formatBrlCents, formatDate, formatDateTime, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Entrega" };

const STATUS_LABEL: Record<string, string> = {
  todo: "A fazer",
  doing: "Em progresso",
  review: "Revisão",
  done: "Feita",
  blocked: "Bloqueada",
};

const STATUS_STYLE: Record<string, string> = {
  todo: "border-border bg-subtle text-muted-foreground",
  doing: "border-link bg-link-soft text-link",
  review: "border-strong bg-card text-foreground",
  done: "border-success bg-success-soft text-success",
  blocked: "border-danger bg-danger-soft text-danger",
};

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function computeLaborCents(minutes: number | null, rateCents: number | null): number | null {
  if (minutes == null) return null;
  if (rateCents == null) return null;
  return Math.floor((minutes * rateCents) / 60);
}

export default async function DeliverableDetailPage({
  params,
}: PageProps<"/admin/projetos/[id]/entregas/[deliverableId]">) {
  const ctx = await requireAdmin();
  const { id, deliverableId } = await params;

  const project = await getProject(ctx, id);
  if (!project) notFound();

  const row = await getDeliverable(ctx, deliverableId);
  if (!row || row.deliverable.projectId !== id) notFound();

  const d = row.deliverable;
  const [predecessors, successors, comments, timeEntries, openTimer, projectDeliverables, phases, rateCents] =
    await Promise.all([
      listPredecessors(ctx, deliverableId),
      listSuccessors(ctx, deliverableId),
      listComments(ctx, deliverableId),
      listTimeEntries(ctx, deliverableId),
      getOpenTimer(ctx),
      listDeliverables(ctx, id, { limit: 500 }),
      listPhases(ctx, id),
      getCurrentUserRateCents(ctx),
    ]);

  const existingComments = comments.filter((c) => !c.deletedAt).length;
  const totalMinutes = timeEntries.reduce((s, e) => s + (e.minutes ?? 0), 0);

  const projectHref = `/admin/projetos/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={d.title}
        meta={
          <>
            <span className={cn("inline-flex h-6 items-center rounded-sm border px-2 text-xs font-medium", STATUS_STYLE[d.status])}>
              {STATUS_LABEL[d.status]}
            </span>
            <span className="text-faint"> · </span>
            <Link href={projectHref} className="text-link hover:underline">
              {project.project.title}
            </Link>
            {row.phase && (
              <>
                <span className="text-faint"> · </span>
                {row.phase.name}
              </>
            )}
            {d.dueAt && (
              <>
                <span className="text-faint"> · </span>
                prazo {formatIsoDate(d.dueAt)}
              </>
            )}
            {row.assignee && (
              <>
                <span className="text-faint"> · </span>
                {row.assignee.name}
              </>
            )}
          </>
        }
        actions={
          <DeliverableFormDialog
            projectId={id}
            phases={phases.map((p) => ({ id: p.id, name: p.name }))}
            assignees={[{ id: ctx.user.id, name: ctx.user.name }]}
            deliverable={{
              id: d.id,
              title: d.title,
              description: d.description,
              status: d.status,
              phaseId: d.phaseId,
              assigneeId: d.assigneeId,
              dueAt: d.dueAt,
            }}
            trigger={<Button variant="secondary" size="sm" type="button">Editar</Button>}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-6">
          {d.description && (
            <Block title="Descrição">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{d.description}</p>
            </Block>
          )}

          <Block title="Horas">
            <div className="flex flex-col gap-4">
              <TimerPanel
                projectId={id}
                deliverableId={deliverableId}
                deliverableTitle={d.title}
                openTimer={openTimer}
              />

              {timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem entradas de tempo ainda.</p>
              ) : (
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-subtle text-muted-foreground">
                      <tr className="text-left">
                        <th className="h-9 px-3 text-[0.7rem] font-medium tracking-wider uppercase">Quando</th>
                        <th className="h-9 px-3 text-right text-[0.7rem] font-medium tracking-wider uppercase">Duração</th>
                        <th className="h-9 px-3 text-[0.7rem] font-medium tracking-wider uppercase">Origem</th>
                        <th className="h-9 px-3 text-[0.7rem] font-medium tracking-wider uppercase">Notas</th>
                        <th className="h-9 px-3 text-right text-[0.7rem] font-medium tracking-wider uppercase">Custo</th>
                        <th className="h-9 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((e) => {
                        const running = e.endedAt === null;
                        const cost = computeLaborCents(e.minutes, rateCents);
                        return (
                          <tr key={e.id} className="border-t border-border">
                            <td className="type-data px-3 py-2 text-xs">{formatDateTime(e.startedAt)}</td>
                            <td className="type-data px-3 py-2 text-right text-xs">
                              {running ? <span className="text-link">rodando…</span> : formatMinutes(e.minutes)}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "inline-flex h-5 items-center rounded-sm px-1.5 text-[0.7rem] font-medium",
                                  e.source === "timer" ? "bg-link-soft text-link" : "bg-warning-soft text-warning",
                                )}
                              >
                                {e.source}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{e.notes ?? "—"}</td>
                            <td className="type-data px-3 py-2 text-right text-xs">
                              {running ? "—" : formatBrlCents(cost)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {!running && e.userId === ctx.user.id && (
                                <form action={deleteTimeEntryForm} className="contents">
                                  <input type="hidden" name="entryId" value={e.id} />
                                  <input type="hidden" name="projectId" value={id} />
                                  <button type="submit" className="text-xs text-muted-foreground hover:text-danger">
                                    Excluir
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-subtle text-sm font-medium">
                        <td className="px-3 py-2">Total (fechadas)</td>
                        <td className="type-data px-3 py-2 text-right">{formatMinutes(totalMinutes)}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <ManualTimeForm projectId={id} deliverableId={deliverableId} />
            </div>
          </Block>

          <Block title={`Comentários (${comments.filter((c) => !c.deletedAt).length})`}>
            <CommentThread
              projectId={id}
              deliverableId={deliverableId}
              comments={comments}
              currentUserId={ctx.user.id}
            />
          </Block>
        </div>

        <div className="flex flex-col gap-6">
          <Block title="Dependências">
            <DependencyPicker
              projectId={id}
              projectHref={projectHref}
              deliverableId={deliverableId}
              predecessors={predecessors}
              successors={successors}
              candidates={projectDeliverables.map((p) => ({
                id: p.id,
                title: p.title,
                status: p.status,
                dueAt: p.dueAt,
              }))}
            />
          </Block>

          <Block title="Portal do cliente">
            <form action={setDeliverableVisibilityForm} className="grid gap-3">
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="visible" value={d.visibleToClient ? "0" : "1"} />
              <p className="text-sm text-muted-foreground">
                {d.visibleToClient
                  ? "Esta entrega aparece no portal. O cliente vê título, descrição, status, prazo, arquivo e comentários — nunca horas, custos ou o motivo de bloqueio."
                  : "Esta entrega é interna. O cliente não a vê no portal."}
              </p>
              {!d.visibleToClient && existingComments > 0 && (
                <p role="note" className="rounded-r-md border-l-[3px] border-warning bg-warning-soft px-3 py-2 text-sm">
                  Já existem <strong>{existingComments} comentário{existingComments === 1 ? "" : "s"}</strong> nesta entrega. Ao compartilhar, o cliente
                  passa a ver todos, inclusive os da equipe. Revise a conversa antes.
                </p>
              )}
              <div>
                <Button type="submit" size="sm" variant={d.visibleToClient ? "outline" : "default"}>
                  {d.visibleToClient ? "Ocultar do cliente" : "Compartilhar com o cliente"}
                </Button>
              </div>
            </form>
          </Block>

          <Block title="Dados">
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <span className={cn("inline-flex h-5 items-center rounded-sm border px-1.5 text-xs", STATUS_STYLE[d.status])}>
                  {STATUS_LABEL[d.status]}
                </span>
              </dd>
              <dt className="text-muted-foreground">Prazo</dt>
              <dd className="type-data">{formatIsoDate(d.dueAt)}</dd>
              <dt className="text-muted-foreground">Fase</dt>
              <dd>{row.phase?.name ?? "sem fase"}</dd>
              <dt className="text-muted-foreground">Responsável</dt>
              <dd>{row.assignee?.name ?? "ninguém"}</dd>
              <dt className="text-muted-foreground">Criada em</dt>
              <dd className="type-data">{formatDate(d.createdAt)}</dd>
              {d.completedAt && (
                <>
                  <dt className="text-muted-foreground">Concluída em</dt>
                  <dd className="type-data">{formatDate(d.completedAt)}</dd>
                </>
              )}
            </dl>
          </Block>
        </div>
      </div>
    </div>
  );
}
