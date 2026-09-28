import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import {
  getProject,
  listDeliverablesGroupedByStatus,
  listPhases,
} from "@/modules/projects/queries";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DeliverableFormDialog } from "@/modules/projects/components/deliverable-form";
import { formatIsoDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  todo: "A fazer",
  doing: "Em progresso",
  review: "Revisão",
  done: "Feita",
  blocked: "Bloqueada",
};

const STATUS_PIP: Record<string, string> = {
  todo: "bg-faint",
  doing: "bg-link",
  review: "bg-signal",
  done: "bg-success",
  blocked: "bg-danger",
};

function initials(name: string | null | undefined): string {
  if (!name) return "";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export const metadata = { title: "Kanban" };

export default async function KanbanPage({ params, searchParams }: PageProps<"/admin/projetos/[id]/kanban">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const [phases, columns] = await Promise.all([
    listPhases(ctx, id),
    listDeliverablesGroupedByStatus(ctx, id, {
      phaseId: typeof sp.phase === "string" ? sp.phase : undefined,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const currentPhase = typeof sp.phase === "string" ? sp.phase : "";

  return (
    <>
      <PageHeader
        title={`Kanban de entregas — ${project.project.title}`}
        meta="Clique em um card pra editar. Mudança de status pelo diálogo. Sem drag & drop."
        actions={
          <DeliverableFormDialog
            projectId={id}
            phases={phases.map((p) => ({ id: p.id, name: p.name }))}
            assignees={[{ id: ctx.user.id, name: ctx.user.name }]}
            trigger={<Button variant="secondary" size="sm" type="button">Nova entrega</Button>}
          />
        }
      />

      <form className="flex flex-wrap items-center gap-3" action={`/admin/projetos/${id}/kanban`}>
        <div className="grid gap-1">
          <label htmlFor="phase" className="type-micro text-muted-foreground">Fase</label>
          <select id="phase" name="phase" defaultValue={currentPhase} className="h-9 rounded-sm border border-input bg-card px-2 text-sm">
            <option value="">Todas</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
        {currentPhase && (
          <Link href={`/admin/projetos/${id}/kanban`} className="type-micro text-link hover:underline">limpar</Link>
        )}
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 overflow-x-auto">
        {columns.map((col) => {
          const collapsed = col.status === "blocked";
          return (
            <section
              key={col.status}
              className={cn("flex flex-col rounded-lg border border-border bg-subtle", collapsed ? "min-h-0" : "min-h-64")}
            >
              <header className={cn("flex items-center gap-2 px-3 py-2.5", !collapsed && "border-b border-border")}>
                <span className={cn("h-2 w-2 rounded-full", STATUS_PIP[col.status])} />
                <h3 className="text-sm font-semibold">{STATUS_LABEL[col.status]}</h3>
                <span className="type-data ml-auto text-[0.75rem] text-muted-foreground">{col.count}</span>
              </header>
              {!collapsed && (
                <div className="grid gap-2 p-2">
                  {col.items.length === 0 ? (
                    <div className="rounded border border-dashed border-border p-4 text-center text-xs text-faint">Vazio.</div>
                  ) : (
                    col.items.map((d) => (
                      <DeliverableFormDialog
                        key={d.id}
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
                        trigger={
                          <button type="button" className="block w-full rounded border border-border bg-card p-3 text-left hover:border-strong">
                            <div className="text-sm font-medium leading-snug">{d.title}</div>
                            <div className="mt-2 flex items-center gap-2 flex-wrap text-[0.75rem] text-muted-foreground">
                              {d.phaseName && (
                                <span className="inline-flex h-4 items-center rounded-sm border border-border px-1 type-data text-[10px]">{d.phaseName}</span>
                              )}
                              {d.assigneeName && (
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-semibold text-card">
                                  {initials(d.assigneeName)}
                                </span>
                              )}
                              {d.fileId && (
                                <span className="type-data text-[10px]" title="Tem anexo">📎</span>
                              )}
                              {d.dueAt && (
                                <span className={cn("type-data text-xs ml-auto", d.dueAt <= today && col.status !== "done" && "text-danger font-medium")}>
                                  {formatIsoDate(d.dueAt)}
                                </span>
                              )}
                            </div>
                          </button>
                        }
                      />
                    ))
                  )}
                </div>
              )}
              {collapsed && col.count > 0 && (
                <div className="border-t border-border p-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Expandir ({col.count})</summary>
                    <div className="grid gap-2 pt-2">
                      {col.items.map((d) => (
                        <DeliverableFormDialog
                          key={d.id}
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
                          trigger={
                            <button type="button" className="block w-full rounded border border-border bg-card p-3 text-left hover:border-strong">
                              <div className="text-sm font-medium leading-snug">{d.title}</div>
                            </button>
                          }
                        />
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
