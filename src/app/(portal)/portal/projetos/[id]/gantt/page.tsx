import { notFound } from "next/navigation";
import { requirePortal } from "@/modules/auth/context";
import {
  getPortalProject,
  listPortalDeliverables,
  listPortalPhases,
} from "@/modules/portal-projects/queries";
import type { GanttScale } from "@/modules/projects/gantt-geometry";
import { GanttView } from "@/modules/projects/components/gantt-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Linha do tempo" };

// "dia" é ruído para o cliente; dependências não aparecem no portal.
const SCALES: GanttScale[] = ["week", "month"];

export default async function PortalGanttPage({ params, searchParams }: PageProps<"/portal/projetos/[id]/gantt">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const sp = await searchParams;
  const project = await getPortalProject(ctx, id);
  if (!project) notFound();

  const [phases, deliverables] = await Promise.all([
    listPortalPhases(ctx, id),
    listPortalDeliverables(ctx, id),
  ]);

  return (
    <>
      <PageHeader
        title={`Linha do tempo — ${project.title}`}
        meta="Fases em barras largas e entregas em barras finas. Clique numa entrega para ver os detalhes."
      />
      <GanttView
        baseHref={`/portal/projetos/${id}/gantt`}
        deliverableHref={(did) => `/portal/projetos/${id}/entregas/${did}`}
        scale={sp.scale === "month" ? "month" : "week"}
        scales={SCALES}
        phases={phases}
        deliverables={deliverables}
        edges={[]}
        clientView
      />
    </>
  );
}
