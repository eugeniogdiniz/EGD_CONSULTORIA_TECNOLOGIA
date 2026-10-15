"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import { MoneyInput } from "@/components/shell/money-input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveInvoiceReceiptForm } from "@/modules/projects/form-actions";
import { formatBrlCents, formatIsoDate } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";

type Invoice = {
  id: string;
  projectId: string;
  number: number;
  description: string;
  amountCents: number;
  dueAt: string;
  paidAt: string | null;
  receivedCents: number | null;
};

/**
 * Registra quanto de fato entrou e quando. Parcela pendente: vira recebida.
 * Parcela já recebida: corrige data e valor.
 */
export function ReceiptDialog({ invoice, today, trigger }: { invoice: Invoice; today: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const edit = Boolean(invoice.paidAt);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(async (prev, fd) => {
    const r = await saveInvoiceReceiptForm(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const p = `rcpt-${invoice.id}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{edit ? "Corrigir recebimento" : "Registrar recebimento"}</DialogTitle>
          <DialogDescription>
            Parcela #{invoice.number} · {invoice.description} · {formatBrlCents(invoice.amountCents)} com vencimento em {formatIsoDate(invoice.dueAt)}.
          </DialogDescription>
        </DialogHeader>
        {/* key: reabrir o diálogo volta aos valores gravados */}
        <form key={String(open)} action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={invoice.id} />
          <input type="hidden" name="projectId" value={invoice.projectId} />
          <input type="hidden" name="mode" value={edit ? "edit" : "pay"} />
          <div className="grid gap-1.5">
            <Label htmlFor={`${p}-amount`}>Valor recebido</Label>
            <MoneyInput
              id={`${p}-amount`}
              name="receivedCents"
              defaultCents={invoice.receivedCents ?? invoice.amountCents}
              required
              aria-invalid={fe?.receivedCents ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">O que de fato entrou na conta, já com taxas, descontos ou juros.</p>
            <FieldError errors={fe?.receivedCents} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${p}-date`}>Data do recebimento</Label>
            <Input id={`${p}-date`} name="paidAt" type="date" defaultValue={invoice.paidAt ?? today} max={today} required aria-invalid={fe?.paidAt ? true : undefined} />
            <FieldError errors={fe?.paidAt} />
          </div>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Salvando…" : edit ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
