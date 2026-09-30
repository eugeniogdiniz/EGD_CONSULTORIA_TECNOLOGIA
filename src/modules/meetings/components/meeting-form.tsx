"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { createMeetingForm, updateMeetingForm } from "@/modules/meetings/form-actions";

type ProjectOption = { id: string; title: string; companyId: string; companyName: string };

export type MeetingFormValues = {
  id: string;
  projectId: string | null;
  companyId: string;
  title: string;
  heldAt: string;
  location: string | null;
  agenda: string | null;
  discussion: string | null;
  decisions: string | null;
  teamIds: string[];
  externals: string;
};

const selectClass = "h-10 rounded-sm border border-input bg-card px-3 text-sm";

export function MeetingForm({
  meeting,
  projects,
  companies,
  team,
  defaultProjectId,
  defaultCompanyId,
  defaultHeldAt,
  cancelHref,
}: {
  meeting?: MeetingFormValues;
  projects: ProjectOption[];
  companies: { id: string; name: string }[];
  team: { id: string; name: string }[];
  defaultProjectId?: string | null;
  defaultCompanyId?: string | null;
  defaultHeldAt: string;
  cancelHref: string;
}) {
  const isEdit = Boolean(meeting);
  const [state, formAction, pending] = useActionState<ActionResult<unknown> | null, FormData>(
    (prev, fd) => (isEdit ? updateMeetingForm(prev as ActionResult<null> | null, fd) : createMeetingForm(prev as ActionResult<{ id: string }> | null, fd)),
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const [projectId, setProjectId] = useState(meeting ? (meeting.projectId ?? "") : (defaultProjectId ?? ""));

  // agrupa os projetos por empresa no seletor
  const byCompany = new Map<string, { name: string; items: ProjectOption[] }>();
  for (const p of projects) {
    const g = byCompany.get(p.companyId) ?? { name: p.companyName, items: [] };
    g.items.push(p);
    byCompany.set(p.companyId, g);
  }

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      {meeting && <input type="hidden" name="id" value={meeting.id} />}

      <div className="grid gap-1.5">
        <Label htmlFor="mt-title">Título</Label>
        <Input id="mt-title" name="title" defaultValue={meeting?.title} required placeholder="Reunião de acompanhamento" aria-invalid={fe?.title ? true : undefined} />
        <FieldError errors={fe?.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="mt-held">Data e hora</Label>
          <Input id="mt-held" name="heldAt" type="datetime-local" defaultValue={meeting?.heldAt ?? defaultHeldAt} required aria-invalid={fe?.heldAt ? true : undefined} />
          <FieldError errors={fe?.heldAt} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mt-location">Local <span className="font-normal text-faint">opcional</span></Label>
          <Input id="mt-location" name="location" defaultValue={meeting?.location ?? ""} placeholder="Google Meet, escritório do cliente…" />
          <FieldError errors={fe?.location} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="mt-project">Projeto</Label>
          <select id="mt-project" name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass}>
            <option value="">Sem projeto (só a empresa)</option>
            {[...byCompany.entries()].map(([cid, g]) => (
              <optgroup key={cid} label={g.name}>
                {g.items.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldError errors={fe?.projectId} />
        </div>
        {projectId === "" && (
          <div className="grid gap-1.5">
            <Label htmlFor="mt-company">Empresa</Label>
            <select id="mt-company" name="companyId" defaultValue={meeting?.companyId ?? defaultCompanyId ?? ""} className={selectClass} required>
              <option value="" disabled>Escolha a empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <FieldError errors={fe?.companyId} />
          </div>
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Participantes da equipe</legend>
        {team.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pessoa ativa na equipe.</p>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {team.map((u) => (
              <label key={u.id} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="teamIds" value={u.id} defaultChecked={meeting?.teamIds.includes(u.id)} />
                {u.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="mt-externals">Participantes externos <span className="font-normal text-faint">um por linha, “Nome — Empresa”</span></Label>
        <Textarea id="mt-externals" name="externals" defaultValue={meeting?.externals ?? ""} rows={3} placeholder={"Ana Souza — Consórcio URBHIS\nCarlos Lima"} />
        <FieldError errors={fe?.externals} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="mt-agenda">Pauta <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="mt-agenda" name="agenda" defaultValue={meeting?.agenda ?? ""} rows={4} />
        <FieldError errors={fe?.agenda} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mt-discussion">Discussão <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="mt-discussion" name="discussion" defaultValue={meeting?.discussion ?? ""} rows={6} />
        <FieldError errors={fe?.discussion} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mt-decisions">Decisões <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="mt-decisions" name="decisions" defaultValue={meeting?.decisions ?? ""} rows={4} />
        <FieldError errors={fe?.decisions} />
      </div>

      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : isEdit ? "Salvar ata" : "Registrar ata"}</Button>
        <Button variant="outline" render={<Link href={cancelHref} />}>Cancelar</Button>
      </div>
      {!isEdit && <p className="text-sm text-muted-foreground">Os itens de ação entram depois de registrar a ata, já como entregas do projeto.</p>}
    </form>
  );
}
