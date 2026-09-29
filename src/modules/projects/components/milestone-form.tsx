"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { createMilestoneForm, updateMilestoneForm } from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Phase = { id: string; name: string };
type Milestone = { id: string; name: string; dueAt: string; phaseId: string | null; notes: string | null };

export function MilestoneFormDialog({
  projectId,
  phases,
  milestone,
  trigger,
}: {
  projectId: string;
  phases: Phase[];
  milestone?: Milestone;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(milestone);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${milestone!.name}` : "Novo marco"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm projectId={projectId} phases={phases} milestone={milestone!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm projectId={projectId} phases={phases} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({ projectId, phases, milestone, fe }: { projectId: string; phases: Phase[]; milestone?: Milestone; fe: Record<string, string[]> | undefined }) {
  return (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      {milestone && <input type="hidden" name="id" value={milestone.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="m-name">Nome</Label>
        <Input id="m-name" name="name" defaultValue={milestone?.name} required aria-invalid={fe?.name ? true : undefined} />
        <FieldError errors={fe?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="m-due">Data</Label>
          <Input id="m-due" name="dueAt" type="date" defaultValue={milestone?.dueAt ?? ""} required aria-invalid={fe?.dueAt ? true : undefined} />
          <FieldError errors={fe?.dueAt} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="m-phase">Fase <span className="font-normal text-faint">opcional</span></Label>
          <select id="m-phase" name="phaseId" defaultValue={milestone?.phaseId ?? ""} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
            <option value="">Sem fase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="m-notes">Notas <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="m-notes" name="notes" defaultValue={milestone?.notes ?? ""} rows={3} />
      </div>
    </>
  );
}

function CreateForm({ projectId, phases, onDone }: { projectId: string; phases: Phase[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createMilestoneForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields projectId={projectId} phases={phases} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Criando…" : "Criar"}</Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ projectId, phases, milestone, onDone }: { projectId: string; phases: Phase[]; milestone: Milestone; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updateMilestoneForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields projectId={projectId} phases={phases} milestone={milestone} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
