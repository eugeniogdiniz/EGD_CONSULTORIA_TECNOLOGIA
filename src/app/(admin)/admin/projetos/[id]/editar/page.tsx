import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import { getProject } from "@/modules/projects/queries";
import { updateProjectForm } from "@/modules/projects/form-actions";
import { ProjectForm } from "@/modules/projects/components/project-form";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Editar projeto" };

export default async function EditarProjetoPage({ params }: PageProps<"/admin/projetos/[id]/editar">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const row = await getProject(ctx, id);
  if (!row) notFound();
  const p = row.project;
  return (
    <>
      <PageHeader title={`Editar ${p.title}`} />
      <Block title="Dados">
        <ProjectForm
          action={updateProjectForm}
          initial={{
            id: p.id,
            title: p.title,
            budgetCents: p.budgetCents,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
            notes: p.notes,
            showHoursToClient: p.showHoursToClient,
          }}
        />
      </Block>
    </>
  );
}
