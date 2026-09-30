import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listTeamMembers } from "@/modules/projects/queries";
import { PRIORITY_LABEL, PRIORITY_STYLE } from "@/modules/projects/priority";
import { STATUS_STYLE } from "@/modules/portal-projects/scope";
import { getMeeting, listActionItems, listParticipants, listProjectsForMeeting } from "@/modules/meetings/queries";
import { deleteMeetingForm } from "@/modules/meetings/form-actions";
import { MeetingText, ParticipantList } from "@/modules/meetings/components/meeting-parts";
import { ActionItemForm } from "@/modules/meetings/components/action-item-form";
import { PrintButton, ShareToggle } from "@/modules/meetings/components/share-toggle";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Ata" };

const STATUS_LABEL: Record<string, string> = { todo: "A fazer", doing: "Em progresso", review: "Revisão", done: "Feita", blocked: "Bloqueada" };

export default async function AtaPage({ params }: PageProps<"/admin/atas/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const row = await getMeeting(ctx, id);
  if (!row) notFound();
  const m = row.meeting;
  const [participants, items, projects, team] = await Promise.all([
    listParticipants(ctx, id),
    listActionItems(ctx, id),
    listProjectsForMeeting(ctx, m.companyId),
    listTeamMembers(ctx),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <>
      <PageHeader
        title={m.title}
        meta={
          <>
            <span className="type-data">{formatDateTime(m.heldAt)}</span>
            {m.location && <><span className="text-faint"> · </span>{m.location}</>}
            <span className="text-faint"> · </span>
            <Link href={`/admin/crm/empresas/${m.companyId}`} className="text-link hover:underline">{row.companyName}</Link>
            {m.projectId && (
              <>
                <span className="text-faint"> · </span>
                <Link href={`/admin/projetos/${m.projectId}`} className="text-link hover:underline">{row.projectTitle}</Link>
              </>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton />
            <Button variant="secondary" size="sm" render={<Link href={`/admin/atas/${m.id}/editar`} />}>Editar</Button>
            <ConfirmAction
              trigger={<Button variant="destructive" size="sm" type="button">Excluir</Button>}
              title={`Excluir a ata "${m.title}"?`}
              description="A ata e a lista de participantes saem do sistema. As entregas criadas pelos itens de ação continuam nos projetos."
              confirmLabel="Excluir ata"
              action={deleteMeetingForm}
              fields={{ id: m.id }}
            />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] print:block">
        <div className="flex flex-col gap-6">
          <Block title="Registro da reunião">
            <MeetingText agenda={m.agenda} discussion={m.discussion} decisions={m.decisions} />
          </Block>

          <Block title="Itens de ação" aside={items.length > 0 ? `${doneCount} de ${items.length} feitos` : undefined}>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item de ação. Cada item vira uma entrega do projeto, com responsável, prazo e prioridade.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Item</th>
                      <th className="py-2 pr-3 font-medium">Responsável</th>
                      <th className="py-2 pr-3 font-medium">Prazo</th>
                      <th className="py-2 pr-3 font-medium">Prioridade</th>
                      <th className="py-2 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((i) => {
                      const late = i.dueAt !== null && i.status !== "done" && i.dueAt < today;
                      return (
                        <tr key={i.deliverableId}>
                          <td className="py-2 pr-3">
                            <Link href={`/admin/projetos/${i.projectId}/entregas/${i.deliverableId}`} className="font-medium hover:text-link">{i.title}</Link>
                            <div className="type-micro text-muted-foreground">{i.projectTitle}{i.visibleToClient ? " · visível ao cliente" : ""}</div>
                          </td>
                          <td className="py-2 pr-3">{i.assigneeName ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className={cn("type-data py-2 pr-3 text-xs whitespace-nowrap", late && "font-medium text-danger")}>
                            {formatIsoDate(i.dueAt)}{late && " · atrasado"}
                          </td>
                          <td className="py-2 pr-3">
                            <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", PRIORITY_STYLE[i.priority])}>{PRIORITY_LABEL[i.priority]}</span>
                          </td>
                          <td className="py-2">
                            <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", STATUS_STYLE[i.status])}>{STATUS_LABEL[i.status]}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <section aria-labelledby="novo-item" className="mt-5 border-t border-border pt-5 print:hidden">
              <h3 id="novo-item" className="mb-3 text-sm font-semibold">Novo item de ação</h3>
              <ActionItemForm
                meetingId={m.id}
                projects={projects}
                defaultProjectId={m.projectId}
                team={team}
                canShare={Boolean(row.linkedOrganizationId)}
              />
            </section>
          </Block>
        </div>

        <div className="flex flex-col gap-6 print:mt-6">
          <Block title="Participantes">
            <ParticipantList participants={participants} />
          </Block>
          <div className="print:hidden">
            <Block title="Portal do cliente">
              {row.linkedOrganizationId ? (
                <ShareToggle meetingId={m.id} shared={m.sharedWithClient} />
              ) : (
                <p className="text-sm text-muted-foreground">A empresa não tem acesso ao portal. Vincule-a a uma organização para compartilhar a ata.</p>
              )}
            </Block>
          </div>
          <p className="type-micro text-muted-foreground print:hidden">Registrada por {row.ownerName} em {formatDateTime(m.createdAt)}.</p>
        </div>
      </div>
    </>
  );
}
