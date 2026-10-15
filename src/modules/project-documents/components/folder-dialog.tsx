"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createFolderForm, deleteFolderForm, updateFolderForm } from "@/modules/project-documents/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Folder = { id: string; name: string; visibleToClient: boolean; systemKey: string | null; count: number };

export function FolderDialog({ projectId, folder, trigger }: { projectId: string; folder?: Folder; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{folder ? `Pasta ${folder.name}` : "Nova pasta"}</DialogTitle>
        </DialogHeader>
        <FolderForm projectId={projectId} folder={folder} onDone={() => setOpen(false)} />
        {folder && !folder.systemKey && <DeleteFolder projectId={projectId} folder={folder} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FolderForm({ projectId, folder, onDone }: { projectId: string; folder?: Folder; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<unknown> | null, FormData>(async (prev, fd) => {
    const r = folder
      ? await updateFolderForm(prev as ActionResult<null> | null, fd)
      : await createFolderForm(prev as ActionResult<{ id: string }> | null, fd);
    if (r?.ok) onDone();
    return r;
  }, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      {folder && <input type="hidden" name="id" value={folder.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="fd-name">Nome</Label>
        <Input id="fd-name" name="name" defaultValue={folder?.name} required maxLength={80} aria-invalid={fe?.name ? true : undefined} />
        <FieldError errors={fe?.name} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="visibleToClient" defaultChecked={folder?.visibleToClient ?? false} className="mt-0.5" />
        <span>
          Compartilhar com o cliente
          <span className="block text-xs text-muted-foreground">O cliente vê e baixa todos os documentos desta pasta no portal.</span>
        </span>
      </label>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : folder ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteFolder({ projectId, folder, onDone }: { projectId: string; folder: Folder; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(async (prev, fd) => {
    const r = await deleteFolderForm(prev, fd);
    if (r?.ok) onDone();
    return r;
  }, null);
  return (
    <form action={formAction} className="grid gap-2 border-t border-border pt-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="id" value={folder.id} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {folder.count > 0 ? "Só pastas vazias podem ser excluídas." : "A pasta está vazia e pode ser excluída."}
        </p>
        <Button type="submit" variant="destructive" size="sm" disabled={pending || folder.count > 0}>
          Excluir pasta
        </Button>
      </div>
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
