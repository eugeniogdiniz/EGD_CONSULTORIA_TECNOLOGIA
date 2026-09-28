import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import {
  getProject,
  listDependencies,
  listDeliverables,
  listPhases,
} from "@/modules/projects/queries";
import type { GanttScale } from "@/modules/projects/gantt-geometry";
import { GanttView } from "@/modules/projects/components/gantt-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Gantt" };

const SCALES: GanttScale[] = ["day", "week", "month"];

function parseScale(v: unknown): GanttScale {
  return v === "day" || v === "month" ? v : "week";
}

export default async function GanttPage({ params, searchParams }: PageProps<"/admin/projetos/[id]/gantt">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const [phases, deliverables, dependencies] = await Promise.all([
    listPhases(ctx, id),
    listDeliverables(ctx, id, { limit: 2000 }),
    listDependencies(ctx, id),
  ]);

  return (
    <>
      <PageHeader
        title={`Linha do tempo — ${project.project.title}`}
        meta="Fases em barras largas, entregas em barras finas. Sem edição na timeline — clique numa barra pra abrir o diálogo."
      />
      <GanttView
        baseHref={`/admin/projetos/${id}/gantt`}
        deliverableHref={(did) => `/admin/projetos/${id}/entregas/${did}`}
        scale={parseScale(sp.scale)}
        scales={SCALES}
        phases={phases.map((p) => ({ id: p.id, name: p.name, startedAt: p.startedAt, endedAt: p.endedAt }))}
        deliverables={deliverables}
        edges={dependencies.map((e) => ({ predecessorId: e.predecessorId, successorId: e.successorId }))}
      />
    </>
  );
}
