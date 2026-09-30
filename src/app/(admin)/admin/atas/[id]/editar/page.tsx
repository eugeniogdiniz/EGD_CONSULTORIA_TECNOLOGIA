import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import { listTeamMembers } from "@/modules/projects/queries";
import { getMeeting, listCompaniesForMeeting, listParticipants, listProjectsForMeeting } from "@/modules/meetings/queries";
import { formatExternalParticipants, toLocalDateTimeInput } from "@/modules/meetings/rules";
import { MeetingForm } from "@/modules/meetings/components/meeting-form";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Editar ata" };

export default async function EditarAtaPage({ params }: PageProps<"/admin/atas/[id]/editar">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const row = await getMeeting(ctx, id);
  if (!row) notFound();
  const m = row.meeting;
  const [projects, companies, team, participants] = await Promise.all([
    listProjectsForMeeting(ctx),
    listCompaniesForMeeting(ctx),
    listTeamMembers(ctx),
    listParticipants(ctx, id),
  ]);

  return (
    <>
      <PageHeader title={`Editar ${m.title}`} />
      <MeetingForm
        meeting={{
          id: m.id,
          projectId: m.projectId,
          companyId: m.companyId,
          title: m.title,
          heldAt: toLocalDateTimeInput(m.heldAt),
          location: m.location,
          agenda: m.agenda,
          discussion: m.discussion,
          decisions: m.decisions,
          teamIds: participants.flatMap((p) => (p.userId ? [p.userId] : [])),
          externals: formatExternalParticipants(participants.filter((p) => !p.userId)),
        }}
        projects={projects}
        companies={companies}
        team={team}
        defaultHeldAt={toLocalDateTimeInput(m.heldAt)}
        cancelHref={`/admin/atas/${m.id}`}
      />
    </>
  );
}
