"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { AttachmentsField } from "./attachments-field";

export function ReplyForm({
  requestId,
  action,
  placeholder = "Escreva sua resposta…",
  submitLabel = "Responder",
  allowInternal = false,
}: {
  requestId: string;
  action: (prev: ActionResult<null> | null, fd: FormData) => Promise<ActionResult<null> | null>;
  placeholder?: string;
  submitLabel?: string;
  /** equipe: caixa "Nota interna" */
  allowInternal?: boolean;
}) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await action(prev, fd);
      if (r?.ok) {
        setBody("");
        setInternal(false);
        setFileKey((k) => k + 1); // limpa o input de arquivos
      }
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form ref={formRef} action={formAction} className="grid gap-2" encType="multipart/form-data">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="sr-only" htmlFor="reply-body">{internal ? "Nota interna" : "Resposta"}</label>
      <Textarea
        id="reply-body"
        name="body"
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={internal ? "Nota interna: o cliente não vê…" : placeholder}
        required
        className={internal ? "border-warning bg-warning-soft/40" : undefined}
      />
      <AttachmentsField key={fileKey} id="reply-files" errors={fe?.files} compact />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {allowInternal ? (
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="internal" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            <span>Nota interna <span className="text-faint">(o cliente não vê)</span></span>
          </label>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" variant={internal ? "outline" : "default"} disabled={pending || body.trim().length === 0}>
          {pending ? "Enviando…" : internal ? "Salvar nota interna" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
