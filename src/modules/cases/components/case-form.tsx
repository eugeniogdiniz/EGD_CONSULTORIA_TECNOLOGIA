"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { SIZE_LABEL, centsToReais, type CaseSize } from "@/modules/cases/public";

export type CaseFormInitial = {
  id: string;
  name: string;
  sector: string;
  size: CaseSize;
  systems: number;
  automations: number;
  savingsCents: number;
  capexCents: number;
  featured: boolean;
  published: boolean;
  deliverables: string[];
  statusNote: string | null;
};

export function CaseForm<T>({
  action,
  initial,
  submitLabel = "Salvar",
}: {
  action: (prev: ActionResult<T> | null, fd: FormData) => Promise<ActionResult<T> | null>;
  initial?: CaseFormInitial;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult<T> | null, FormData>(action, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const optional = <span className="font-normal text-faint">opcional</span>;
  return (
    <form action={formAction} className="grid max-w-2xl gap-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Cliente</Label>
          <Input id="name" name="name" defaultValue={initial?.name} required aria-invalid={fe?.name ? true : undefined} />
          <FieldError errors={fe?.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sector">Setor</Label>
          <Input id="sector" name="sector" defaultValue={initial?.sector} required aria-invalid={fe?.sector ? true : undefined} />
          <FieldError errors={fe?.sector} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="size">Porte</Label>
          <select id="size" name="size" defaultValue={initial?.size ?? "medium"} className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
            {(Object.keys(SIZE_LABEL) as CaseSize[]).map((s) => (
              <option key={s} value={s}>{SIZE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="systems">Sistemas</Label>
          <Input id="systems" name="systems" type="number" min={0} defaultValue={initial?.systems ?? 0} aria-invalid={fe?.systems ? true : undefined} />
          <FieldError errors={fe?.systems} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="automations">Automações</Label>
          <Input id="automations" name="automations" type="number" min={0} defaultValue={initial?.automations ?? 0} aria-invalid={fe?.automations ? true : undefined} />
          <FieldError errors={fe?.automations} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="capex">CAPEX (R$) {optional}</Label>
          <Input id="capex" name="capex" inputMode="decimal" placeholder="0,00" defaultValue={centsToReais(initial?.capexCents ?? 0)} aria-invalid={fe?.capex ? true : undefined} />
          <FieldError errors={fe?.capex} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="savings">Economia anual (R$) {optional}</Label>
          <Input id="savings" name="savings" inputMode="decimal" placeholder="0,00" defaultValue={centsToReais(initial?.savingsCents ?? 0)} aria-invalid={fe?.savings ? true : undefined} />
          <FieldError errors={fe?.savings} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="deliverables">Entregas {optional}</Label>
        <Textarea id="deliverables" name="deliverables" rows={5} defaultValue={initial?.deliverables.join("\n")} aria-invalid={fe?.deliverables ? true : undefined} />
        <span className="type-micro text-faint">Uma entrega por linha (até 12).</span>
        <FieldError errors={fe?.deliverables} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="statusNote">Nota de status {optional}</Label>
        <Input id="statusNote" name="statusNote" defaultValue={initial?.statusNote ?? ""} placeholder="Em desenvolvimento" aria-invalid={fe?.statusNote ? true : undefined} />
        <span className="type-micro text-faint">Vazio = em produção.</span>
        <FieldError errors={fe?.statusNote} />
      </div>
      <div className="grid gap-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} />
          Publicado no site
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={initial?.featured ?? false} />
          Em destaque (aparece entre os cases em destaque de /cases)
        </label>
      </div>
      {state && !state.ok && !fe && (
        <p role="alert" className="rounded-r-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm">{state.error}</p>
      )}
      {state?.ok && !initial && null}
      {state?.ok && initial && (
        <p role="status" className="rounded-r-md border-l-[3px] border-success bg-success-soft px-4 py-3 text-sm">Case salvo. O site já reflete a mudança.</p>
      )}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : submitLabel}</Button>
      </div>
    </form>
  );
}
