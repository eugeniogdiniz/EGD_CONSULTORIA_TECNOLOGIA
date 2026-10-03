"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createServiceForm, updateServiceForm } from "@/modules/crm/form-actions";
import type { ActionResult } from "@/lib/action-result";

export type Service = { id: string; name: string; description: string | null; unit: string; defaultPriceCents: number; position: number };

const toReais = (c: number | null) => (c == null ? "" : (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const toCents = (raw: string) => {
  const n = Number(raw.trim().replace(/\./g, "").replace(",", "."));
  return raw.trim() === "" ? "" : Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100)) : raw;
};

export function ServiceFormDialog({ service, trigger }: { service?: Service; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reais, setReais] = useState(toReais(service?.defaultPriceCents ?? null));
  const isEdit = Boolean(service);
  const [state, formAction, pending] = useActionState<ActionResult<unknown> | null, FormData>(
    async (prev, fd) => {
      const r = isEdit ? await updateServiceForm(prev as ActionResult<null> | null, fd) : await createServiceForm(prev as ActionResult<{ id: string }> | null, fd);
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
          <DialogTitle>{isEdit ? "Editar serviço" : "Novo serviço"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          {service && <input type="hidden" name="id" value={service.id} />}
          <input type="hidden" name="defaultPriceCents" value={toCents(reais)} />
          <div className="grid gap-1.5">
            <Label htmlFor="svc-name">Nome</Label>
            <Input id="svc-name" name="name" defaultValue={service?.name} required aria-invalid={fe?.name ? true : undefined} />
            <FieldError errors={fe?.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="svc-price">Preço de referência (R$)</Label>
              <Input id="svc-price" inputMode="decimal" value={reais} onChange={(e) => setReais(e.target.value)} placeholder="0,00" required aria-invalid={fe?.defaultPriceCents ? true : undefined} />
              <FieldError errors={fe?.defaultPriceCents} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="svc-unit">Unidade</Label>
              <Input id="svc-unit" name="unit" defaultValue={service?.unit ?? "projeto"} placeholder="hora, mês, projeto" required aria-invalid={fe?.unit ? true : undefined} />
              <FieldError errors={fe?.unit} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-desc">Descrição <span className="font-normal text-faint">opcional</span></Label>
            <Textarea id="svc-desc" name="description" rows={3} defaultValue={service?.description ?? ""} />
          </div>
          <div className="grid gap-1.5 sm:max-w-[40%]">
            <Label htmlFor="svc-pos">Ordem</Label>
            <Input id="svc-pos" name="position" type="number" min={0} defaultValue={service?.position ?? 0} />
          </div>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : isEdit ? "Salvar" : "Criar serviço"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
