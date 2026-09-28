import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import { getProject, listDeliverables, listMilestones } from "@/modules/projects/queries";
import { CalendarView } from "@/modules/projects/components/calendar-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Calendário" };

export default async function CalendarioPage({ params, searchParams }: PageProps<"/admin/projetos/[id]/calendario">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const [milestones, deliverables] = await Promise.all([
    listMilestones(ctx, id),
    listDeliverables(ctx, id, { limit: 2000 }),
  ]);

  return (
    <>
      <PageHeader
        title={`Calendário — ${project.project.title}`}
        meta="Marcos e entregas com data. Clique num item pra abrir o diálogo. Semana começa segunda."
      />
      <CalendarView
        baseHref={`/admin/projetos/${id}/calendario`}
        deliverableHref={(did) => `/admin/projetos/${id}/entregas/${did}`}
        rawYm={sp.ym}
        milestones={milestones}
        deliverables={deliverables}
      />
    </>
  );
}
