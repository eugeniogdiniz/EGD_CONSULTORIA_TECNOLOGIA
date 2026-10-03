import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { getRequestForAdmin, listOrgProjectsForAdmin, listRequestAttachments, listRequestMessagesForAdmin } from "@/modules/requests/queries";
import { listTeamMembers } from "@/modules/projects/queries";
import { PRIORITIES, PRIORITY_LABEL, PRIORITY_STYLE } from "@/modules/projects/priority";
import { ConvertRequestForm } from "@/modules/requests/components/convert-request-form";
import { STATUS_LABEL, STATUS_STYLE, type RequestStatus } from "@/modules/requests/status";
import { assignRequestForm, replyAsTeamForm, setRequestPriorityForm, setRequestStatusForm } from "@/modules/requests/form-actions";
import { SlaBadge } from "@/modules/requests/components/sla-badge";
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
  const [messages, orgProjects, team, attachments] = await Promise.all([
    listRequestMessagesForAdmin(ctx, id),
    listOrgProjectsForAdmin(ctx, req.organizationId),
    listTeamMembers(ctx),
    listRequestAttachments(ctx, id),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader
        title={req.title}
        meta={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium", STATUS_STYLE[req.status])}>
              {STATUS_LABEL[req.status]}
            </span>
            <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium", PRIORITY_STYLE[req.priority])}>
              {PRIORITY_LABEL[req.priority]}
            </span>
            <SlaBadge request={req} now={now} />
            {req.assigneeName && <span className="text-muted-foreground">· {req.assigneeName}</span>}
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
      <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
        <Block title="Conversa">
          <div className="grid gap-6">
            <RequestThread opener={{ authorName: req.authorName, body: req.body, createdAt: req.createdAt }} messages={messages} attachments={attachments} area="admin" />
            <ReplyForm
              requestId={req.id}
              action={replyAsTeamForm}
              placeholder="Responder ao cliente (ele recebe por e-mail)…"
              allowInternal
            />
          </div>
        </Block>

        <div className="grid gap-6">
          <Block title="Triagem">
            <form action={assignRequestForm} className="mb-4 flex items-end gap-2">
              <input type="hidden" name="id" value={req.id} />
              <div className="grid flex-1 gap-1.5">
                <label htmlFor="rq-assignee" className="text-sm font-medium">Responsável</label>
                <select id="rq-assignee" name="assigneeId" defaultValue={req.assigneeId ?? ""} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
                  <option value="">Ninguém ainda</option>
                  {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <Button type="submit" size="sm" variant="outline">Definir responsável</Button>
            </form>
            <form action={setRequestPriorityForm} className="flex items-end gap-2">
              <input type="hidden" name="id" value={req.id} />
              <div className="grid flex-1 gap-1.5">
                <label htmlFor="rq-priority" className="text-sm font-medium">Prioridade</label>
                <select id="rq-priority" name="priority" defaultValue={req.priority} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </div>
              <Button type="submit" size="sm" variant="outline">Salvar</Button>
            </form>
            <p className="type-micro mt-3 text-muted-foreground">
              SLA de primeira resposta em horas úteis (seg–sex, 9h–18h): urgente 2 h, alta 4 h, média 8 h, baixa 16 h. Mudar a prioridade antes da primeira resposta recalcula o prazo.
            </p>
          </Block>

          <Block title="Transformar em entrega">
            {req.deliverableId ? (
              <p className="text-sm">
                Já virou a entrega{" "}
                <Link
                  href={`/admin/projetos/${req.deliverableProjectId}/entregas/${req.deliverableId}`}
                  className="font-medium text-link hover:underline"
                >
                  {req.deliverableTitle}
                </Link>
                .
              </p>
            ) : (
              <ConvertRequestForm
                key={req.priority}
                requestId={req.id}
                defaultPriority={req.priority}
                defaultProjectId={req.projectId}
                projects={orgProjects}
                team={team}
              />
            )}
          </Block>
        </div>
      </div>
    </>
  );
}
