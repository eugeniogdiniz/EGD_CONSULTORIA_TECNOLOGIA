"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createInvoiceForm, updateInvoiceForm } from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Invoice = { id: string; description: string; amountCents: number; dueAt: string; notes: string | null };

const toReais = (cents: number | null) => (cents == null ? "" : (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
function reaisToCents(raw: string): string {
  const t = raw.trim();
  if (t === "") return "";
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100)) : raw;
}

export function InvoiceFormDialog({ projectId, invoice, trigger }: { projectId: string; invoice?: Invoice; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reais, setReais] = useState(toReais(invoice?.amountCents ?? null));
  const isEdit = Boolean(invoice);
  const [state, formAction, pending] = useActionState<ActionResult<unknown> | null, FormData>(
    async (prev, fd) => {
      const r = isEdit ? await updateInvoiceForm(prev as ActionResult<null> | null, fd) : await createInvoiceForm(prev as ActionResult<{ id: string }> | null, fd);
      if (r?.ok) {
        setOpen(false);
        if (!isEdit) setReais("");
      }
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar parcela` : "Nova parcela"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="projectId" value={projectId} />
          {invoice && <input type="hidden" name="id" value={invoice.id} />}
          <input type="hidden" name="amountCents" value={reaisToCents(reais)} />
          <div className="grid gap-1.5">
            <Label htmlFor="inv-desc">Descrição</Label>
            <Input id="inv-desc" name="description" defaultValue={invoice?.description} placeholder="Parcela 1 de 3 · entrada" required aria-invalid={fe?.description ? true : undefined} />
            <FieldError errors={fe?.description} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-amount">Valor (R$)</Label>
              <Input id="inv-amount" inputMode="decimal" value={reais} onChange={(e) => setReais(e.target.value)} placeholder="0,00" required aria-invalid={fe?.amountCents ? true : undefined} />
              <FieldError errors={fe?.amountCents} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-due">Vencimento</Label>
              <Input id="inv-due" name="dueAt" type="date" defaultValue={invoice?.dueAt ?? ""} required aria-invalid={fe?.dueAt ? true : undefined} />
              <FieldError errors={fe?.dueAt} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="inv-notes">Observações <span className="font-normal text-faint">opcional</span></Label>
            <Textarea id="inv-notes" name="notes" rows={2} defaultValue={invoice?.notes ?? ""} />
          </div>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : isEdit ? "Salvar" : "Criar parcela"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
