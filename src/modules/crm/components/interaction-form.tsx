"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createInteractionForm } from "@/modules/crm/form-actions";
import type { ActionResult } from "@/lib/action-result";

const TYPES = [
  { value: "note", label: "Nota" },
  { value: "call", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "meeting", label: "Reunião" },
] as const;

/**
 * Diálogo pra registrar interação. Recebe âncoras opcionais (companyId,
 * contactId, opportunityId) — pelo menos uma tem de vir preenchida do
 * contexto (empresa ou oportunidade). `back` é o path pra revalidar.
 */
export function InteractionFormDialog({
  companyId,
  contactId,
  opportunityId,
  back,
  trigger,
  defaultType = "note",
}: {
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
  back: string;
  trigger: React.ReactNode;
  defaultType?: "note" | "call" | "email" | "meeting";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createInteractionForm(prev, fd);
      if (r?.ok) setOpen(false);
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const nowIso = new Date().toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar interação</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="_back" value={back} />
          {companyId && <input type="hidden" name="companyId" value={companyId} />}
          {contactId && <input type="hidden" name="contactId" value={contactId} />}
          {opportunityId && <input type="hidden" name="opportunityId" value={opportunityId} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="i-type">Tipo</Label>
              <select
                id="i-type"
                name="type"
                defaultValue={defaultType}
                className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="i-at">Quando</Label>
              <Input
                id="i-at"
                name="at"
                type="datetime-local"
                defaultValue={nowIso}
                required
                aria-invalid={fe?.at ? true : undefined}
              />
              <FieldError errors={fe?.at} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="i-summary">Resumo</Label>
            <Input id="i-summary" name="summary" required aria-invalid={fe?.summary ? true : undefined} />
            <FieldError errors={fe?.summary} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="i-body">Detalhe <span className="font-normal text-faint">opcional</span></Label>
            <Textarea id="i-body" name="body" rows={5} />
          </div>

          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Registrando…" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
