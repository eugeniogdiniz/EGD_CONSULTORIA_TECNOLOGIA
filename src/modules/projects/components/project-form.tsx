"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";

export function ProjectForm({
  action,
  initial,
}: {
  action: (prev: ActionResult<null> | null, fd: FormData) => Promise<ActionResult<null> | null>;
  initial: {
    id: string;
    title: string;
    budgetCents: number | null;
    startedAt: string | null;
    endedAt: string | null;
    notes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(action, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid max-w-2xl gap-4">
      <input type="hidden" name="id" value={initial.id} />
      <div className="grid gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={initial.title} required aria-invalid={fe?.title ? true : undefined} />
        <FieldError errors={fe?.title} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="budget">Orçamento <span className="font-normal text-faint">cents BRL</span></Label>
          <Input id="budget" name="budgetCents" type="number" min={0} defaultValue={initial.budgetCents ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="startedAt">Iniciado em</Label>
          <Input id="startedAt" name="startedAt" type="date" defaultValue={initial.startedAt ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="endedAt">Encerrado em</Label>
          <Input id="endedAt" name="endedAt" type="date" defaultValue={initial.endedAt ?? ""} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" defaultValue={initial.notes ?? ""} rows={5} />
      </div>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-success">Dados salvos.</p>}
      <div><Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button></div>
    </form>
  );
}
