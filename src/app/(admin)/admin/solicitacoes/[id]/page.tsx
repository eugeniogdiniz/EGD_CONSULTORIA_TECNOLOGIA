import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { getRequestForAdmin, listRequestMessagesForAdmin } from "@/modules/requests/queries";
import { STATUS_LABEL, STATUS_STYLE, type RequestStatus } from "@/modules/requests/status";
import { replyAsTeamForm, setRequestStatusForm } from "@/modules/requests/form-actions";
import { RequestThread } from "@/modules/requests/components/request-thread";
import { ReplyForm } from "@/modules/requests/components/reply-form";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Solicitação" };

const STATUSES: RequestStatus[] = ["open", "in_progress", "resolved"];

export default async function AdminSolicitacaoPage({ params }: PageProps<"/admin/solicitacoes/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const req = await getRequestForAdmin(ctx, id);
  if (!req) notFound();
  const messages = await listRequestMessagesForAdmin(ctx, id);

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
            <Link href="/admin/solicitacoes" className="text-link hover:underline">Solicitações</Link>
            <span className="text-faint">·</span>
            <Link href={`/admin/organizacoes/${req.organizationId}`} className="text-link hover:underline">{req.organizationName}</Link>
            {req.projectId && req.projectTitle && (
              <>
                <span className="text-faint">·</span>
                <Link href={`/admin/projetos/${req.projectId}`} className="text-link hover:underline">{req.projectTitle}</Link>
              </>
            )}
            <span className="text-faint">·</span>
            <span>{req.authorName} ({req.authorEmail}) · {formatDateTime(req.createdAt)}</span>
          </span>
        }
        actions={
          <div className="flex gap-2">
            {STATUSES.filter((s) => s !== req.status).map((s) => (
              <form key={s} action={setRequestStatusForm}>
                <input type="hidden" name="id" value={req.id} />
                <input type="hidden" name="status" value={s} />
                <Button type="submit" variant="outline" size="sm">→ {STATUS_LABEL[s]}</Button>
              </form>
            ))}
          </div>
        }
      />
      <Block title="Conversa">
        <div className="grid gap-6">
          <RequestThread opener={{ authorName: req.authorName, body: req.body, createdAt: req.createdAt }} messages={messages} />
          <ReplyForm
            requestId={req.id}
            action={replyAsTeamForm}
            placeholder="Responder ao cliente (ele recebe por e-mail)…"
          />
        </div>
      </Block>
    </>
  );
}
