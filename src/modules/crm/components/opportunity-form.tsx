"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { createOpportunityForm, updateOpportunityForm } from "@/modules/crm/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Contact = { id: string; name: string };
type Opportunity = {
  id: string;
  title: string;
  stage: "new" | "qualified" | "meeting" | "proposal" | "won" | "lost";
  valueCents: number | null;
  currency: string;
  expectedCloseAt: string | null;
  nextStep: string | null;
  nextStepAt: string | null;
  primaryContactId: string | null;
};

export function OpportunityFormDialog({
  companyId,
  contacts,
  opportunity,
  trigger,
}: {
  companyId: string;
  contacts: Contact[];
  opportunity?: Opportunity;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(opportunity);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${opportunity!.title}` : "Nova oportunidade"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm companyId={companyId} contacts={contacts} opportunity={opportunity!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm companyId={companyId} contacts={contacts} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({
  companyId,
  contacts,
  opportunity,
  fe,
}: {
  companyId: string;
  contacts: Contact[];
  opportunity?: Opportunity;
  fe: Record<string, string[]> | undefined;
}) {
  return (
    <>
      <input type="hidden" name="companyId" value={companyId} />
      {opportunity && <input type="hidden" name="id" value={opportunity.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="o-title">Título</Label>
        <Input id="o-title" name="title" defaultValue={opportunity?.title} required aria-invalid={fe?.title ? true : undefined} />
        <FieldError errors={fe?.title} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="o-value">Valor <span className="font-normal text-faint">em cents (BRL)</span></Label>
          <Input
            id="o-value"
            name="valueCents"
            type="number"
            min={0}
            step={1}
            defaultValue={opportunity?.valueCents ?? ""}
            aria-invalid={fe?.valueCents ? true : undefined}
          />
          <FieldError errors={fe?.valueCents} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="o-close">Previsão de fechamento <span className="font-normal text-faint">opcional</span></Label>
          <Input
            id="o-close"
            name="expectedCloseAt"
            type="date"
            defaultValue={opportunity?.expectedCloseAt ?? ""}
            aria-invalid={fe?.expectedCloseAt ? true : undefined}
          />
          <FieldError errors={fe?.expectedCloseAt} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="o-next">Próximo passo <span className="font-normal text-faint">opcional</span></Label>
          <Input id="o-next" name="nextStep" defaultValue={opportunity?.nextStep ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="o-nextat">Data do próximo passo <span className="font-normal text-faint">opcional</span></Label>
          <Input id="o-nextat" name="nextStepAt" type="date" defaultValue={opportunity?.nextStepAt ?? ""} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="o-contact">Contato principal <span className="font-normal text-faint">opcional</span></Label>
        <select
          id="o-contact"
          name="primaryContactId"
          defaultValue={opportunity?.primaryContactId ?? ""}
          className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
        >
          <option value="">Sem contato principal</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {opportunity ? (
        <input type="hidden" name="stage" value={opportunity.stage} />
      ) : (
        <input type="hidden" name="stage" value="new" />
      )}
    </>
  );
}

function CreateForm({ companyId, contacts, onDone }: { companyId: string; contacts: Contact[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createOpportunityForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields companyId={companyId} contacts={contacts} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Criar"}</Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({
  companyId,
  contacts,
  opportunity,
  onDone,
}: {
  companyId: string;
  contacts: Contact[];
  opportunity: Opportunity;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updateOpportunityForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields companyId={companyId} contacts={contacts} opportunity={opportunity} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
