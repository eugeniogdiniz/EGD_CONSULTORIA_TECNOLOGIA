import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import { getPortalRequest, listPortalRequestMessages } from "@/modules/requests/queries";
import { canClientResolve, STATUS_LABEL, STATUS_STYLE } from "@/modules/requests/status";
import { replyAsClientForm, resolveAsClientForm } from "@/modules/requests/form-actions";
import { RequestThread } from "@/modules/requests/components/request-thread";
import { ReplyForm } from "@/modules/requests/components/reply-form";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Solicitação" };

export default async function PortalSolicitacaoPage({ params }: PageProps<"/portal/solicitacoes/[id]">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const req = await getPortalRequest(ctx, id);
  if (!req) notFound();
  const messages = await listPortalRequestMessages(ctx, id);

  return (
    <>
      <PageHeader
        title={req.title}
        meta={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium", STATUS_STYLE[req.status])}>
              {STATUS_LABEL[req.status]}
            </span>
            <span className="text-faint">·</span>
            <Link href="/portal/solicitacoes" className="text-link hover:underline">Solicitações</Link>
            {req.projectId && req.projectTitle && (
              <>
                <span className="text-faint">·</span>
                <Link href={`/portal/projetos/${req.projectId}`} className="text-link hover:underline">{req.projectTitle}</Link>
              </>
            )}
            <span className="text-faint">·</span>
            <span>aberta em {formatDateTime(req.createdAt)}</span>
          </span>
        }
        actions={
          canClientResolve(req.status) ? (
            <form action={resolveAsClientForm}>
              <input type="hidden" name="id" value={req.id} />
              <Button type="submit" variant="outline" size="sm">Marcar como resolvida</Button>
            </form>
          ) : undefined
        }
      />
      {req.deliverableId && req.deliverableTitle && req.deliverableProjectId && (
        <div className="rounded-r-md border-l-[3px] border-link bg-link-soft px-4 py-3 text-sm">
          Sua solicitação virou a entrega{" "}
          <Link href={`/portal/projetos/${req.deliverableProjectId}/entregas/${req.deliverableId}`} className="font-medium text-link underline decoration-1 underline-offset-[3px]">
            {req.deliverableTitle}
          </Link>
          . Acompanhe o andamento por lá.
        </div>
      )}
      <Block title="Conversa">
        <div className="grid gap-6">
          <RequestThread
            opener={{ authorName: req.authorName, body: req.body, createdAt: req.createdAt }}
            messages={messages}
          />
          <ReplyForm
            requestId={req.id}
            action={replyAsClientForm}
            placeholder={req.status === "resolved" ? "Responder reabre a solicitação…" : "Escreva sua resposta…"}
          />
        </div>
      </Block>
    </>
  );
}
