import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import { getProject, listDeliverablesForBurndown, listPhases } from "@/modules/projects/queries";
import { buildBurndown, formatHours } from "@/modules/projects/burndown";
import { BurndownView } from "@/modules/projects/components/burndown-view";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { todayInSaoPaulo } from "@/modules/reports/dates";

export const metadata = { title: "Burndown" };

export default async function BurndownPage({ params }: PageProps<"/admin/projetos/[id]/burndown">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const project = await getProject(ctx, id);
  if (!project) notFound();
  const [deliverables, phases] = await Promise.all([listDeliverablesForBurndown(ctx, id), listPhases(ctx, id)]);
  const today = todayInSaoPaulo();
  const firstPhase = phases.map((p) => p.startedAt).filter((d): d is string => Boolean(d)).sort()[0];
  const from = project.project.startedAt ?? firstPhase ?? project.project.createdAt.toISOString().slice(0, 10);
  const b = buildBurndown(deliverables, { from, to: project.project.endedAt ?? null, today });
  return (
    <>
      <PageHeader
        title={`Burndown — ${project.project.title}`}
        meta={b.estimated > 0 ? `${formatHours(b.totalMinutes)} estimadas em ${b.estimated} entregas · ${formatHours(b.doneMinutes)} concluídas${b.unestimated ? ` · ${b.unestimated} sem estimativa` : ""}` : "Horas estimadas restantes por semana."}
      />
      <Block title="Restante por semana" aside={`de ${from.split("-").reverse().join("/")} até ${b.to.split("-").reverse().join("/")}`}>
        {b.estimated === 0 ? (
          <EmptyState
            title="Nenhuma entrega tem estimativa."
            text='Preencha "Estimativa (h)" no diálogo das entregas (kanban ou visão geral) e o gráfico aparece aqui.'
            action={<Link href={`/admin/projetos/${id}/kanban`} className="text-sm font-medium text-link hover:underline">Abrir o kanban</Link>}
          />
        ) : (
          <BurndownView b={b} />
        )}
      </Block>
    </>
  );
}
