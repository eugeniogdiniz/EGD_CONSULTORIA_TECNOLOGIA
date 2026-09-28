"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  createTemplateFromProjectForm,
  updateTemplateForm,
} from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

/** Salvar-como-template a partir de um projeto existente. */
export function SaveAsTemplateDialog({
  projectId,
  defaultName,
  trigger,
}: {
  projectId: string;
  defaultName: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createTemplateFromProjectForm(prev, fd);
      if (r?.ok) setOpen(false);
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar como template</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grid gap-1.5">
            <Label htmlFor="t-name">Nome do template</Label>
            <Input id="t-name" name="name" defaultValue={defaultName} required aria-invalid={fe?.name ? true : undefined} />
            <FieldError errors={fe?.name} />
            <span className="type-micro text-faint">Precisa ser único.</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-desc">Descrição <span className="font-normal text-faint">opcional</span></Label>
            <Textarea id="t-desc" name="description" rows={3} />
          </div>
          <p className="type-micro text-muted-foreground leading-relaxed">
            Fases e entregas do projeto viram um snapshot rígido. Status, prazo, responsável e anexos ficam de fora.
          </p>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar template"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Renomear/editar descrição de um template existente. */
export function RenameTemplateDialog({
  template,
  trigger,
}: {
  template: { id: string; name: string; description: string | null };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updateTemplateForm(prev, fd);
      if (r?.ok) setOpen(false);
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar template</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={template.id} />
          <div className="grid gap-1.5">
            <Label htmlFor="rt-name">Nome</Label>
            <Input id="rt-name" name="name" defaultValue={template.name} required aria-invalid={fe?.name ? true : undefined} />
            <FieldError errors={fe?.name} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rt-desc">Descrição</Label>
            <Textarea id="rt-desc" name="description" defaultValue={template.description ?? ""} rows={3} />
          </div>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
