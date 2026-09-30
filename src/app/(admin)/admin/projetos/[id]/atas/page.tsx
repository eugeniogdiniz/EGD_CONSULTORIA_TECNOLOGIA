import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import { getProject } from "@/modules/projects/queries";
import { listMeetings } from "@/modules/meetings/queries";
import { MeetingList } from "@/modules/meetings/components/meeting-parts";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Atas do projeto" };

export default async function ProjetoAtasPage({ params }: PageProps<"/admin/projetos/[id]/atas">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const row = await getProject(ctx, id);
  if (!row) notFound();
  const items = await listMeetings(ctx, { projectId: id });
  const novaHref = `/admin/atas/nova?projeto=${id}`;

  return (
    <>
      <PageHeader
        title={`Atas · ${row.project.title}`}
        meta={row.company.name}
        actions={row.project.archivedAt ? null : <Button size="sm" render={<Link href={novaHref} />}>Nova ata</Button>}
      />
      <MeetingList
        items={items}
        hrefFor={(mid) => `/admin/atas/${mid}`}
        empty={{ title: "Nenhuma ata neste projeto.", text: "Registre as reuniões do projeto para guardar decisões e transformar combinados em entregas." }}
      />
    </>
  );
}
