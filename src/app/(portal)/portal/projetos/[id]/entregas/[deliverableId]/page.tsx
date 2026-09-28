import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import {
  getPortalDeliverable,
  getPortalProject,
  listPortalComments,
} from "@/modules/portal-projects/queries";
import { portalStatusLabel, STATUS_STYLE } from "@/modules/portal-projects/scope";
import {
  createClientCommentForm,
  deleteClientCommentForm,
  updateClientCommentForm,
} from "@/modules/portal-projects/form-actions";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CommentThread } from "@/modules/projects/components/comment-thread";
import { formatBytes, formatDate, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Entrega" };

export default async function PortalEntregaPage({
  params,
}: PageProps<"/portal/projetos/[id]/entregas/[deliverableId]">) {
  const ctx = await requirePortal();
  const { id, deliverableId } = await params;
  const [project, d] = await Promise.all([
    getPortalProject(ctx, id),
    getPortalDeliverable(ctx, id, deliverableId),
  ]);
  if (!project || !d) notFound();

  const comments = await listPortalComments(ctx, deliverableId);
  const visibleComments = comments.filter((c) => !c.deletedAt).length;
  const chip = "inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap";

  return (
    <>
      <PageHeader
        title={d.title}
        meta={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className={cn(chip, STATUS_STYLE[d.status])}>{portalStatusLabel(d.status)}</span>
            <span className="text-faint">·</span>
            <Link href={`/portal/projetos/${id}`} className="text-link hover:underline">
              {project.title}
            </Link>
            {d.phaseName && (
              <>
                <span className="text-faint">·</span>
                <span>{d.phaseName}</span>
              </>
            )}
            {d.dueAt && (
              <>
                <span className="text-faint">·</span>
                <span>
                  prazo <span className="type-data">{formatIsoDate(d.dueAt)}</span>
                </span>
              </>
            )}
          </span>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          {d.status === "blocked" && (
            <div className="rounded-r-md border-l-[3px] border-warning bg-warning-soft px-4 py-3 text-sm">
              <strong>Em espera.</strong> Esta entrega está aguardando um retorno ou liberação. A equipe da EGD entra em
              contato se precisar de algo de vocês.
            </div>
          )}

          {d.description && (
            <Block title="Descrição">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{d.description}</p>
            </Block>
          )}

          {d.fileId && d.fileName && (
            <Block title="Arquivo da entrega">
              <div className="flex items-center gap-3.5 rounded-md border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.fileName}</div>
                  <div className="type-micro text-muted-foreground">
                    {d.fileSize != null && `${formatBytes(d.fileSize)}`}
                    {d.fileCreatedAt && ` · enviado em ${formatDate(d.fileCreatedAt)}`}
                  </div>
                </div>
                <form method="post" action={`/portal/projetos/${id}/entregas/${deliverableId}/baixar`}>
                  <Button type="submit" variant="outline" size="sm">Baixar</Button>
                </form>
              </div>
              <p className="type-micro mt-2.5 text-faint">
                O download abre um link temporário e fica registrado no histórico da EGD.
              </p>
            </Block>
          )}

          <Block title={`Comentários (${visibleComments})`}>
            <CommentThread
              projectId={id}
              deliverableId={deliverableId}
              comments={comments}
              currentUserId={ctx.user.id}
              showTeamBadge
              actions={{
                create: createClientCommentForm,
                update: updateClientCommentForm,
                remove: deleteClientCommentForm,
              }}
            />
          </Block>
        </div>

        <Block title="Dados">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span className={cn(chip, STATUS_STYLE[d.status])}>{portalStatusLabel(d.status)}</span>
            </dd>
            <dt className="text-muted-foreground">Prazo</dt>
            <dd className="type-data">{formatIsoDate(d.dueAt)}</dd>
            <dt className="text-muted-foreground">Fase</dt>
            <dd>{d.phaseName ?? "Sem fase"}</dd>
            <dt className="text-muted-foreground">Responsável</dt>
            <dd>{d.assigneeName ?? "—"}</dd>
          </dl>
        </Block>
      </div>
    </>
  );
}
