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
import { createProposalForm, updateProposalForm } from "@/modules/crm/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Proposal = {
  id: string;
  title: string;
  valueCents: number;
  validUntil: string | null;
};

export function ProposalFormDialog({
  opportunityId,
  proposal,
  trigger,
}: {
  opportunityId: string;
  proposal?: Proposal;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(proposal);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar rascunho" : "Nova proposta"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm opportunityId={opportunityId} proposal={proposal!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm opportunityId={opportunityId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({ opportunityId, proposal, fe }: { opportunityId: string; proposal?: Proposal; fe: Record<string, string[]> | undefined }) {
  return (
    <>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {proposal && <input type="hidden" name="id" value={proposal.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="p-title">Título</Label>
        <Input id="p-title" name="title" defaultValue={proposal?.title} required aria-invalid={fe?.title ? true : undefined} />
        <FieldError errors={fe?.title} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="p-value">Valor <span className="font-normal text-faint">em cents (BRL)</span></Label>
          <Input
            id="p-value"
            name="valueCents"
            type="number"
            min={1}
            step={1}
            defaultValue={proposal?.valueCents ?? ""}
            required
            aria-invalid={fe?.valueCents ? true : undefined}
          />
          <FieldError errors={fe?.valueCents} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-valid">Válida até <span className="font-normal text-faint">opcional</span></Label>
          <Input id="p-valid" name="validUntil" type="date" defaultValue={proposal?.validUntil ?? ""} />
        </div>
      </div>
    </>
  );
}

function CreateForm({ opportunityId, onDone }: { opportunityId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string; number: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createProposalForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields opportunityId={opportunityId} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Criando…" : "Criar rascunho"}</Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ opportunityId, proposal, onDone }: { opportunityId: string; proposal: Proposal; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updateProposalForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields opportunityId={opportunityId} proposal={proposal} fe={fe} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
