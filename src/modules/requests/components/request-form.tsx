"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";

export function RequestForm({
  action,
  projects,
}: {
  action: (prev: ActionResult<{ id: string }> | null, fd: FormData) => Promise<ActionResult<{ id: string }> | null>;
  projects: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid max-w-2xl gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Assunto</Label>
        <Input id="title" name="title" required aria-invalid={fe?.title ? true : undefined} />
        <FieldError errors={fe?.title} />
      </div>
      {projects.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="projectId">Projeto <span className="font-normal text-faint">opcional</span></Label>
          <select id="projectId" name="projectId" defaultValue="" className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
            <option value="">Nenhum em especial</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <FieldError errors={fe?.projectId} />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="body">Descreva sua solicitação</Label>
        <Textarea id="body" name="body" rows={7} required aria-invalid={fe?.body ? true : undefined} />
        <FieldError errors={fe?.body} />
      </div>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitação"}</Button>
      </div>
    </form>
  );
}
