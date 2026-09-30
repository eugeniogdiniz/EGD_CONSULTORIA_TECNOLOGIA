import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import { getPortalMeeting, listPortalActionItems } from "@/modules/meetings/queries";
import { portalStatusLabel, STATUS_STYLE } from "@/modules/portal-projects/scope";
import { MeetingText, ParticipantList } from "@/modules/meetings/components/meeting-parts";
import { PrintButton } from "@/modules/meetings/components/share-toggle";
import { PageHeader, Block } from "@/components/shell/page-header";
import { formatDateTime, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Ata" };

export default async function PortalAtaPage({ params }: PageProps<"/portal/atas/[id]">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const m = await getPortalMeeting(ctx, id);
  if (!m) notFound();
  const items = await listPortalActionItems(ctx, id);

  return (
    <>
      <PageHeader
        title={m.title}
        meta={
          <>
            <span className="type-data">{formatDateTime(m.heldAt)}</span>
            {m.location && <><span className="text-faint"> · </span>{m.location}</>}
            <span className="text-faint"> · </span>
            {m.projectId ? (
              <Link href={`/portal/projetos/${m.projectId}`} className="text-link hover:underline">{m.projectTitle}</Link>
            ) : (
              m.companyName
            )}
          </>
        }
        actions={<div className="print:hidden"><PrintButton /></div>}
      />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] print:block">
        <div className="flex flex-col gap-6">
          <Block title="Registro da reunião">
            <MeetingText agenda={m.agenda} discussion={m.discussion} decisions={m.decisions} />
          </Block>
          {items.length > 0 && (
            <Block title="Encaminhamentos">
              <ul className="divide-y divide-border">
                {items.map((i) => (
                  <li key={i.deliverableId} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
                    <span>
                      <Link href={`/portal/projetos/${i.projectId}/entregas/${i.deliverableId}`} className="font-medium hover:text-link">{i.title}</Link>
                      <span className="type-micro block text-muted-foreground">
                        {i.assigneeName ?? "Equipe EGD"} · prazo {formatIsoDate(i.dueAt)}
                      </span>
                    </span>
                    <span className={cn("inline-flex h-[22px] w-fit items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", STATUS_STYLE[i.status])}>
                      {portalStatusLabel(i.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
        <div className="print:mt-6">
          <Block title="Participantes">
            <ParticipantList participants={m.participants} />
          </Block>
        </div>
      </div>
    </>
  );
}
