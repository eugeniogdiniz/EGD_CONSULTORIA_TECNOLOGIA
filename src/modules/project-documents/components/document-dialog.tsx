"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateDocumentForm } from "@/modules/project-documents/form-actions";
import type { ActionResult } from "@/lib/action-result";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-link-soft";

type Doc = { id: string; title: string; notes: string | null; folderId: string };

export function DocumentDialog({
  projectId,
  doc,
  folders,
  trigger,
}: {
  projectId: string;
  doc: Doc;
  folders: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(async (prev, fd) => {
    const r = await updateDocumentForm(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="id" value={doc.id} />
          <div className="grid gap-1.5">
            <Label htmlFor={`doc-title-${doc.id}`}>Título</Label>
            <Input id={`doc-title-${doc.id}`} name="title" defaultValue={doc.title} required maxLength={200} aria-invalid={fe?.title ? true : undefined} />
            <FieldError errors={fe?.title} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`doc-folder-${doc.id}`}>Pasta</Label>
            <select id={`doc-folder-${doc.id}`} name="folderId" defaultValue={doc.folderId} className={selectClass}>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <FieldError errors={fe?.folderId} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`doc-notes-${doc.id}`}>Observações</Label>
            <Textarea id={`doc-notes-${doc.id}`} name="notes" defaultValue={doc.notes ?? ""} rows={3} />
            <FieldError errors={fe?.notes} />
          </div>
          {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
