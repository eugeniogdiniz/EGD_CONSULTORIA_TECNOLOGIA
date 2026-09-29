"use client";

import { useState } from "react";
import { useActionState } from "react";
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
import { createContactForm, updateContactForm } from "@/modules/crm/form-actions";
import type { ActionResult } from "@/lib/action-result";

const ROLE_OPTIONS = [
  { value: "primary", label: "Principal" },
  { value: "technical", label: "Técnico" },
  { value: "financial", label: "Financeiro" },
  { value: "other", label: "Outro" },
] as const;

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "primary" | "technical" | "financial" | "other";
  title: string | null;
  notes: string | null;
};

export function ContactFormDialog({
  companyId,
  contact,
  trigger,
}: {
  companyId: string;
  contact?: Contact;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(contact);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${contact!.name}` : "Adicionar contato"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm companyId={companyId} contact={contact!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm companyId={companyId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({
  fe,
  companyId,
  contact,
}: {
  fe: Record<string, string[]> | undefined;
  companyId: string;
  contact?: Contact;
}) {
  return (
    <>
      <input type="hidden" name="companyId" value={companyId} />
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="c-name">Nome</Label>
        <Input id="c-name" name="name" defaultValue={contact?.name} required aria-invalid={fe?.name ? true : undefined} />
        <FieldError errors={fe?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="c-email">E-mail <span className="font-normal text-faint">opcional</span></Label>
          <Input id="c-email" name="email" type="email" defaultValue={contact?.email ?? ""} aria-invalid={fe?.email ? true : undefined} />
          <FieldError errors={fe?.email} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-phone">Telefone <span className="font-normal text-faint">opcional</span></Label>
          <Input id="c-phone" name="phone" defaultValue={contact?.phone ?? ""} aria-invalid={fe?.phone ? true : undefined} />
          <FieldError errors={fe?.phone} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="c-role">Papel</Label>
          <select
            id="c-role"
            name="role"
            defaultValue={contact?.role ?? "primary"}
            className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
            aria-invalid={fe?.role ? true : undefined}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <FieldError errors={fe?.role} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-title">Cargo <span className="font-normal text-faint">opcional</span></Label>
          <Input id="c-title" name="title" defaultValue={contact?.title ?? ""} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-notes">Notas <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="c-notes" name="notes" defaultValue={contact?.notes ?? ""} rows={3} />
      </div>
    </>
  );
}

function CreateForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      const r = await createContactForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields fe={fe} companyId={companyId} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Adicionar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({
  companyId,
  contact,
  onDone,
}: {
  companyId: string;
  contact: Contact;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await updateContactForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields fe={fe} companyId={companyId} contact={contact} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
