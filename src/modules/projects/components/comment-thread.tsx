"use client";

import { useActionState, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createCommentForm,
  deleteCommentForm,
  updateCommentForm,
} from "@/modules/projects/form-actions";
import { formatDate } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";

export type CommentRow = {
  id: string;
  parentId: string | null;
  body: string | null;
  deletedAt: Date | string | null;
  authorId: string;
  authorName: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export function CommentThread({
  projectId,
  deliverableId,
  comments,
  currentUserId,
}: {
  projectId: string;
  deliverableId: string;
  comments: CommentRow[];
  currentUserId: string;
}) {
  const roots = comments.filter((c) => c.parentId === null);
  const repliesByParent = new Map<string, CommentRow[]>();
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesByParent.has(c.parentId)) repliesByParent.set(c.parentId, []);
      repliesByParent.get(c.parentId)!.push(c);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {roots.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda. Puxe a conversa.</p>
      )}
      {roots.map((root) => (
        <CommentItem
          key={root.id}
          projectId={projectId}
          deliverableId={deliverableId}
          comment={root}
          replies={repliesByParent.get(root.id) ?? []}
          currentUserId={currentUserId}
        />
      ))}
      <ComposerForm projectId={projectId} deliverableId={deliverableId} />
    </div>
  );
}

function CommentItem({
  projectId,
  deliverableId,
  comment,
  replies,
  currentUserId,
}: {
  projectId: string;
  deliverableId: string;
  comment: CommentRow;
  replies: CommentRow[];
  currentUserId: string;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const isOwn = comment.authorId === currentUserId;
  const isDeleted = !!comment.deletedAt || comment.body === null;

  return (
    <div className="grid grid-cols-[32px_1fr] gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-card">
        {initials(comment.authorName)}
      </div>
      <div>
        <div className="flex items-baseline gap-2 text-sm">
          <b className="font-medium">{comment.authorName}</b>
          <span className="type-data text-xs text-faint">{formatDate(toDate(comment.createdAt))}</span>
          {comment.updatedAt && toDate(comment.updatedAt).getTime() !== toDate(comment.createdAt).getTime() && !isDeleted && (
            <span className="type-micro text-faint">editado</span>
          )}
        </div>
        {isDeleted ? (
          <p className="mt-1 text-sm text-faint italic">[comentário apagado]</p>
        ) : editing ? (
          <EditCommentForm
            projectId={projectId}
            comment={comment}
            onDone={() => setEditing(false)}
          />
        ) : (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{comment.body}</p>
        )}
        {!isDeleted && !editing && (
          <div className="mt-2 flex gap-4 text-xs">
            {comment.parentId === null && (
              <button type="button" onClick={() => setReplying((v) => !v)} className="text-muted-foreground hover:text-foreground">
                {replying ? "Cancelar" : "Responder"}
              </button>
            )}
            {isOwn && (
              <>
                <button type="button" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                  Editar
                </button>
                <form action={deleteCommentForm} className="contents">
                  <input type="hidden" name="id" value={comment.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <button type="submit" className="text-muted-foreground hover:text-danger">
                    Excluir
                  </button>
                </form>
              </>
            )}
          </div>
        )}
        {replies.length > 0 && (
          <div className="mt-3 ml-2 grid gap-3 border-l-2 border-border pl-3">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                projectId={projectId}
                deliverableId={deliverableId}
                comment={r}
                replies={[]}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
        {replying && (
          <div className="mt-3 ml-2 border-l-2 border-border pl-3">
            <ComposerForm
              projectId={projectId}
              deliverableId={deliverableId}
              parentId={comment.id}
              onDone={() => setReplying(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ComposerForm({
  projectId,
  deliverableId,
  parentId,
  onDone,
}: {
  projectId: string;
  deliverableId: string;
  parentId?: string;
  onDone?: () => void;
}) {
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createCommentForm(prev, fd);
      if (r?.ok) {
        setBody("");
        onDone?.();
      }
      return r;
    },
    null,
  );
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="deliverableId" value={deliverableId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <Textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={parentId ? "Responder…" : "Escrever comentário…"}
        required
      />
      {state && !state.ok && <p role="alert" className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        {onDone && (
          <Button type="button" variant="outline" size="xs" onClick={onDone}>Cancelar</Button>
        )}
        <Button type="submit" size="xs" disabled={pending || body.trim().length === 0}>
          {pending ? "Enviando…" : parentId ? "Responder" : "Comentar"}
        </Button>
      </div>
    </form>
  );
}

function EditCommentForm({
  projectId,
  comment,
  onDone,
}: {
  projectId: string;
  comment: CommentRow;
  onDone: () => void;
}) {
  const [body, setBody] = useState(comment.body ?? "");
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updateCommentForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  return (
    <form action={formAction} className={cn("mt-2 grid gap-2")}>
      <input type="hidden" name="id" value={comment.id} />
      <input type="hidden" name="projectId" value={projectId} />
      <Textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} required />
      {state && !state.ok && <p role="alert" className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="xs" onClick={onDone}>Cancelar</Button>
        <Button type="submit" size="xs" disabled={pending || body.trim().length === 0}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
