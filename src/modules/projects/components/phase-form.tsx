"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { createPhaseForm, updatePhaseForm } from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Phase = { id: string; name: string; startedAt: string | null; endedAt: string | null; notes: string | null };

export function PhaseFormDialog({
  projectId,
  phase,
  trigger,
}: {
  projectId: string;
  phase?: Phase;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(phase);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${phase!.name}` : "Nova fase"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm projectId={projectId} phase={phase!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm projectId={projectId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({ projectId, phase, fe }: { projectId: string; phase?: Phase; fe: Record<string, string[]> | undefined }) {
  return (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      {phase && <input type="hidden" name="id" value={phase.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="ph-name">Nome</Label>
        <Input id="ph-name" name="name" defaultValue={phase?.name} required aria-invalid={fe?.name ? true : undefined} />
        <FieldError errors={fe?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ph-start">Iniciada em</Label>
          <Input id="ph-start" name="startedAt" type="date" defaultValue={phase?.startedAt ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ph-end">Encerrada em</Label>
          <Input id="ph-end" name="endedAt" type="date" defaultValue={phase?.endedAt ?? ""} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ph-notes">Notas</Label>
        <Textarea id="ph-notes" name="notes" defaultValue={phase?.notes ?? ""} rows={3} />
      </div>
    </>
  );
}

function CreateForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createPhaseForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields projectId={projectId} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Criando…" : "Criar"}</Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ projectId, phase, onDone }: { projectId: string; phase: Phase; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updatePhaseForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields projectId={projectId} phase={phase} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
