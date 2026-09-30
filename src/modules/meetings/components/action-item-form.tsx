"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { PRIORITIES, PRIORITY_LABEL } from "@/modules/projects/priority";
import { addActionItemForm } from "@/modules/meetings/form-actions";

const selectClass = "h-10 rounded-sm border border-input bg-card px-3 text-sm";

/** Novo item de ação: vira uma entrega "A fazer" no projeto escolhido. */
export function ActionItemForm({
  meetingId,
  projects,
  defaultProjectId,
  team,
  canShare,
}: {
  meetingId: string;
  projects: { id: string; title: string }[];
  defaultProjectId: string | null;
  team: { id: string; name: string }[];
  canShare: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult<{ deliverableId: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await addActionItemForm(prev, fd);
      if (r?.ok) formRef.current?.reset();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta empresa não tem projeto ativo. Itens de ação viram entregas de um projeto: crie o projeto para registrá-los.
      </p>
    );
  }
  return (
    <form ref={formRef} action={formAction} className="grid gap-3" aria-label="Novo item de ação">
      <input type="hidden" name="meetingId" value={meetingId} />
      <div className="grid gap-1.5">
        <Label htmlFor="ai-title">O que fazer</Label>
        <Input id="ai-title" name="title" required aria-invalid={fe?.title ? true : undefined} />
        <FieldError errors={fe?.title} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ai-project">Projeto</Label>
          <select id="ai-project" name="projectId" defaultValue={defaultProjectId ?? projects[0].id} className={selectClass}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <FieldError errors={fe?.projectId} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-assignee">Responsável <span className="font-normal text-faint">opcional</span></Label>
          <select id="ai-assignee" name="assigneeId" defaultValue="" className={selectClass}>
            <option value="">Ninguém ainda</option>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-due">Prazo <span className="font-normal text-faint">opcional</span></Label>
          <Input id="ai-due" name="dueAt" type="date" />
          <FieldError errors={fe?.dueAt} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-priority">Prioridade</Label>
          <select id="ai-priority" name="priority" defaultValue="medium" className={selectClass}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>
      </div>
      {canShare && (
        <label className="inline-flex items-start gap-2 text-sm">
          <input type="checkbox" name="visibleToClient" className="mt-0.5" />
          <span>Visível ao cliente (aparece no portal e na ata compartilhada).</span>
        </label>
      )}
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-success">Item registrado como entrega.</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Registrando…" : "Adicionar item de ação"}</Button>
      </div>
    </form>
  );
}
