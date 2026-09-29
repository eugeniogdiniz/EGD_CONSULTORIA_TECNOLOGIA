"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { createProjectFromOpportunityForm } from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

export type TemplateOption = {
  id: string;
  name: string;
  phaseCount: number;
  deliverableCount: number;
};

export function CreateProjectDialog({
  opportunityId,
  defaultTitle,
  valueCents,
  templates = [],
  trigger,
}: {
  opportunityId: string;
  defaultTitle: string;
  valueCents: number | null;
  templates?: TemplateOption[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    createProjectFromOpportunityForm,
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const brl = valueCents == null ? "sem valor" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueCents / 100);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar projeto da oportunidade</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="opportunityId" value={opportunityId} />
          <div className="grid gap-1.5">
            <Label htmlFor="p-title">Título do projeto</Label>
            <Input id="p-title" name="title" defaultValue={defaultTitle} required aria-invalid={fe?.title ? true : undefined} />
            <FieldError errors={fe?.title} />
          </div>
          {templates.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="p-tpl">Modelo <span className="font-normal text-faint">opcional</span></Label>
              <select
                id="p-tpl"
                name="templateId"
                defaultValue=""
                className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
              >
                <option value="">Nenhum — projeto vazio</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.phaseCount} fases · {t.deliverableCount} entregas
                  </option>
                ))}
              </select>
              <p className="type-micro text-muted-foreground">
                Fases e entregas do modelo entram como &ldquo;A fazer&rdquo;, com você como responsável.
              </p>
            </div>
          )}
          <label className="inline-flex items-start gap-2 text-sm">
            <input type="checkbox" name="copyValue" defaultChecked className="mt-0.5" />
            <span>
              Copiar o valor da oportunidade (<span className="type-data">{brl}</span>) como orçamento snapshot.
            </span>
          </label>
          <p className="type-micro text-muted-foreground leading-relaxed">
            O projeto nasce em <span className="type-data">planning</span>. Fases, marcos e entregas são criados depois no detalhe.
          </p>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Criando…" : "Criar projeto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
