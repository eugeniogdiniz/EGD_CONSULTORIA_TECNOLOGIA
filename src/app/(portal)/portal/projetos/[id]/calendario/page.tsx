import { notFound } from "next/navigation";
import { requirePortal } from "@/modules/auth/context";
import {
  getPortalProject,
  listPortalDeliverables,
  listPortalMilestones,
} from "@/modules/portal-projects/queries";
import { CalendarView } from "@/modules/projects/components/calendar-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Calendário" };

export default async function PortalCalendarioPage({ params, searchParams }: PageProps<"/portal/projetos/[id]/calendario">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const sp = await searchParams;
  const project = await getPortalProject(ctx, id);
  if (!project) notFound();

  const [milestones, deliverables] = await Promise.all([
    listPortalMilestones(ctx, id),
    listPortalDeliverables(ctx, id),
  ]);

  return (
    <>
      <PageHeader
        title={`Calendário — ${project.title}`}
        meta="Marcos e entregas com data. Clique numa entrega para ver os detalhes. A semana começa na segunda."
      />
      <CalendarView
        baseHref={`/portal/projetos/${id}/calendario`}
        deliverableHref={(did) => `/portal/projetos/${id}/entregas/${did}`}
        rawYm={sp.ym}
        milestones={milestones}
        deliverables={deliverables}
        clientView
      />
    </>
  );
}
