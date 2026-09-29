"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { PRIORITIES, PRIORITY_LABEL, type Priority } from "@/modules/projects/priority";
import { convertRequestForm } from "@/modules/requests/form-actions";

export function ConvertRequestForm({
  requestId,
  defaultPriority,
  defaultProjectId,
  projects,
  team,
}: {
  requestId: string;
  defaultPriority: Priority;
  defaultProjectId: string | null;
  projects: { id: string; title: string }[];
  team: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult<{ deliverableId: string }> | null, FormData>(convertRequestForm, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta organização ainda não tem projeto. Vincule a empresa do CRM à organização e crie o projeto para converter a solicitação em entrega.
      </p>
    );
  }
  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="id" value={requestId} />
      <div className="grid gap-1.5">
        <Label htmlFor="cv-project">Projeto</Label>
        <select id="cv-project" name="projectId" defaultValue={defaultProjectId ?? projects[0].id} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
          {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <FieldError errors={fe?.projectId} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="cv-priority">Prioridade</Label>
          <select id="cv-priority" name="priority" defaultValue={defaultPriority} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cv-due">Prazo <span className="font-normal text-faint">opcional</span></Label>
          <Input id="cv-due" name="dueAt" type="date" />
          <FieldError errors={fe?.dueAt} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cv-assignee">Responsável <span className="font-normal text-faint">opcional</span></Label>
        <select id="cv-assignee" name="assigneeId" defaultValue="" className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
          <option value="">Ninguém ainda</option>
          {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <label className="inline-flex items-start gap-2 text-sm">
        <input type="checkbox" name="visibleToClient" defaultChecked className="mt-0.5" />
        <span>Compartilhar a entrega com o cliente (ele acompanha o andamento no portal).</span>
      </label>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Convertendo…" : "Converter em entrega"}</Button>
      </div>
    </form>
  );
}
