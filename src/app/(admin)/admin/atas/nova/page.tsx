import { requireAdmin } from "@/modules/auth/context";
import { listTeamMembers } from "@/modules/projects/queries";
import { listCompaniesForMeeting, listProjectsForMeeting } from "@/modules/meetings/queries";
import { toLocalDateTimeInput } from "@/modules/meetings/rules";
import { MeetingForm } from "@/modules/meetings/components/meeting-form";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Nova ata" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function NovaAtaPage({ searchParams }: PageProps<"/admin/atas/nova">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const [projects, companies, team] = await Promise.all([
    listProjectsForMeeting(ctx),
    listCompaniesForMeeting(ctx),
    listTeamMembers(ctx),
  ]);
  const projectId = projects.some((p) => p.id === str(sp.projeto)) ? str(sp.projeto) : null;
  const companyId = companies.some((c) => c.id === str(sp.empresa)) ? str(sp.empresa) : null;
  // hora cheia atual, em Brasília
  const now = new Date();
  now.setMinutes(0, 0, 0);

  return (
    <>
      <PageHeader title="Nova ata" meta="Registre a reunião; os itens de ação entram na página da ata." />
      <MeetingForm
        projects={projects}
        companies={companies}
        team={team}
        defaultProjectId={projectId}
        defaultCompanyId={companyId}
        defaultHeldAt={toLocalDateTimeInput(now)}
        cancelHref={projectId ? `/admin/projetos/${projectId}/atas` : "/admin/atas"}
      />
    </>
  );
}
