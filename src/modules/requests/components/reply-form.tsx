"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

export function ReplyForm({
  requestId,
  action,
  placeholder = "Escreva sua resposta…",
  submitLabel = "Responder",
}: {
  requestId: string;
  action: (prev: ActionResult<null> | null, fd: FormData) => Promise<ActionResult<null> | null>;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await action(prev, fd);
      if (r?.ok) setBody("");
      return r;
    },
    null,
  );
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="sr-only" htmlFor="reply-body">Resposta</label>
      <Textarea id="reply-body" name="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} required />
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || body.trim().length === 0}>
          {pending ? "Enviando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
