"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  changeDeliverableStatusForm,
  createDeliverableForm,
  deleteDeliverableForm,
  updateDeliverableForm,
} from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Phase = { id: string; name: string };
type Assignee = { id: string; name: string };
type Deliverable = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "doing" | "review" | "done" | "blocked";
  phaseId: string | null;
  assigneeId: string | null;
  dueAt: string | null;
};

const STATUSES = [
  { value: "todo", label: "A fazer" },
  { value: "doing", label: "Em progresso" },
  { value: "review", label: "Revisão" },
  { value: "done", label: "Feita" },
  { value: "blocked", label: "Bloqueada" },
] as const;

export function DeliverableFormDialog({
  projectId,
  phases,
  assignees,
  deliverable,
  trigger,
  defaultPhaseId,
}: {
  projectId: string;
  phases: Phase[];
  assignees: Assignee[];
  deliverable?: Deliverable;
  trigger: React.ReactNode;
  defaultPhaseId?: string;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(deliverable);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar entrega" : "Nova entrega"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm projectId={projectId} phases={phases} assignees={assignees} deliverable={deliverable!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm projectId={projectId} phases={phases} assignees={assignees} defaultPhaseId={defaultPhaseId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({
  projectId,
  phases,
  assignees,
  deliverable,
  defaultPhaseId,
  fe,
}: {
  projectId: string;
  phases: Phase[];
  assignees: Assignee[];
  deliverable?: Deliverable;
  defaultPhaseId?: string;
  fe: Record<string, string[]> | undefined;
}) {
  return (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      {deliverable && <input type="hidden" name="id" value={deliverable.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="d-title">Título</Label>
        <Input id="d-title" name="title" defaultValue={deliverable?.title} required aria-invalid={fe?.title ? true : undefined} />
        <FieldError errors={fe?.title} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="d-phase">Fase</Label>
          <select id="d-phase" name="phaseId" defaultValue={deliverable?.phaseId ?? defaultPhaseId ?? ""} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
            <option value="">Sem fase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-assignee">Responsável</Label>
          <select id="d-assignee" name="assigneeId" defaultValue={deliverable?.assigneeId ?? ""} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
            <option value="">Ninguém</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="d-due">Prazo <span className="font-normal text-faint">opcional</span></Label>
        <Input id="d-due" name="dueAt" type="date" defaultValue={deliverable?.dueAt ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="d-desc">Descrição <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="d-desc" name="description" defaultValue={deliverable?.description ?? ""} rows={4} />
      </div>
    </>
  );
}

function CreateForm({
  projectId,
  phases,
  assignees,
  defaultPhaseId,
  onDone,
}: {
  projectId: string;
  phases: Phase[];
  assignees: Assignee[];
  defaultPhaseId?: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createDeliverableForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields projectId={projectId} phases={phases} assignees={assignees} defaultPhaseId={defaultPhaseId} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Criando…" : "Criar"}</Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({
  projectId,
  phases,
  assignees,
  deliverable,
  onDone,
}: {
  projectId: string;
  phases: Phase[];
  assignees: Assignee[];
  deliverable: Deliverable;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updateDeliverableForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const [pendingStatus, setPendingStatus] = useState<Deliverable["status"]>(deliverable.status);
  const [blockReason, setBlockReason] = useState("");

  const [statusState, statusAction, statusPending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await changeDeliverableStatusForm(prev, fd);
      return r;
    },
    null,
  );

  return (
    <div className="grid gap-4">
      {/* Status picker embutido */}
      <form action={statusAction} className="grid gap-2 rounded-sm border border-border bg-subtle p-3">
        <input type="hidden" name="id" value={deliverable.id} />
        <input type="hidden" name="projectId" value={projectId} />
        <div className="flex items-center gap-2">
          <Label htmlFor="s-to" className="text-xs">Status</Label>
          <select
            id="s-to"
            name="to"
            value={pendingStatus}
            onChange={(e) => setPendingStatus(e.target.value as Deliverable["status"])}
            className="h-8 flex-1 rounded-sm border border-input bg-card px-2 text-xs"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Button type="submit" size="xs" disabled={statusPending || pendingStatus === deliverable.status}>
            {statusPending ? "…" : "Aplicar"}
          </Button>
        </div>
        {pendingStatus === "blocked" && (
          <div className="grid gap-1">
            <Label htmlFor="s-reason" className="text-xs">Motivo do bloqueio (obrigatório)</Label>
            <Input
              id="s-reason"
              name="blockReason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              minLength={3}
              required
              className="h-8 text-xs"
            />
          </div>
        )}
        {statusState && !statusState.ok && (
          <p role="alert" className="text-xs text-danger">{statusState.error}</p>
        )}
      </form>

      <form action={formAction} className="grid gap-4">
        <Fields projectId={projectId} phases={phases} assignees={assignees} deliverable={deliverable} fe={fe} />
        {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <DialogFooter>
          <form action={deleteDeliverableForm} className="mr-auto">
            <input type="hidden" name="id" value={deliverable.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <Button type="submit" size="sm" variant="destructive">Excluir</Button>
          </form>
          <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Fechar</DialogClose>
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </div>
  );
}
