"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";
import { sendProposalByEmailForm } from "@/modules/crm/form-actions";

export function SendProposalDialog({
  proposalId,
  contacts,
  defaultContactId,
  defaultMessage,
  filename,
  disabledReason,
}: {
  proposalId: string;
  contacts: { id: string; name: string; email: string }[];
  defaultContactId: string | null;
  defaultMessage: string;
  filename: string | null;
  disabledReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await sendProposalByEmailForm(prev, fd);
      if (r?.ok) setOpen(false);
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" type="button" disabled={Boolean(disabledReason)} title={disabledReason ?? undefined}>
            Enviar por e-mail
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar proposta por e-mail</DialogTitle>
          <DialogDescription>
            O PDF anexado ({filename ?? "—"}) vai para o contato escolhido. Em rascunho, a proposta passa a Enviada e a interação entra na linha do tempo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={proposalId} />
          <div className="grid gap-1.5">
            <Label htmlFor="sp-contact">Para</Label>
            <select id="sp-contact" name="contactId" defaultValue={defaultContactId ?? contacts[0]?.id ?? ""} className="h-10 rounded-sm border border-input bg-card px-3 text-sm" required>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.email}</option>
              ))}
            </select>
            <FieldError errors={fe?.contactId} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sp-message">Mensagem</Label>
            <Textarea id="sp-message" name="message" rows={7} defaultValue={defaultMessage} required />
            <FieldError errors={fe?.message} />
          </div>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Enviando…" : "Enviar agora"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
