import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import {
  getProject,
  listDeliverablesGroupedByStatus,
  listPhases,
} from "@/modules/projects/queries";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DeliverableFormDialog } from "@/modules/projects/components/deliverable-form";
import { KanbanBoard, type KanbanCard } from "@/modules/projects/components/kanban-board";

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

  const phaseOpts = phases.map((p) => ({ id: p.id, name: p.name }));
  const assigneeOpts = [{ id: ctx.user.id, name: ctx.user.name }];

  const boardColumns = columns.map((col) => ({
    status: col.status,
    items: col.items.map<KanbanCard>((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      status: d.status,
      priority: d.priority,
      position: d.position,
      phaseId: d.phaseId,
      phaseName: d.phaseName,
      assigneeId: d.assigneeId,
      assigneeName: d.assigneeName,
      dueAt: d.dueAt,
      fileId: d.fileId,
    })),
  }));

  return (
    <>
      <PageHeader
        title={`Kanban de entregas — ${project.project.title}`}
        meta="Arraste para mover ou clique para editar. Mover pra Bloqueada pede motivo."
        actions={
          <DeliverableFormDialog
            projectId={id}
            phases={phaseOpts}
            assignees={assigneeOpts}
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

      <KanbanBoard
        projectId={id}
        initialColumns={boardColumns}
        phases={phaseOpts}
        assignees={assigneeOpts}
        today={today}
      />
    </>
  );
}
