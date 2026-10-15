"use client";

import { useActionState, useRef, useState } from "react";
import { uploadDocumentsForm, type UploadDocumentsState } from "@/modules/project-documents/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-link-soft";

export function UploadDocumentsForm({
  projectId,
  folders,
  defaultFolderId,
}: {
  projectId: string;
  folders: { id: string; name: string }[];
  defaultFolderId: string | null;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<UploadDocumentsState, FormData>(async (prev, fd) => {
    const r = await uploadDocumentsForm(prev, fd);
    if (r?.ok) {
      ref.current?.reset();
      setCount(0);
    }
    return r;
  }, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form ref={ref} action={action} className="grid gap-4 md:grid-cols-[1.4fr_1fr_1.2fr_auto] md:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-1.5">
        <Label htmlFor="ged-files">Arquivos</Label>
        <Input
          id="ged-files"
          name="files"
          type="file"
          multiple
          required
          onChange={(e) => setCount(e.currentTarget.files?.length ?? 0)}
          aria-invalid={fe?.files ? true : undefined}
        />
        <FieldError errors={fe?.files} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ged-folder">Pasta</Label>
        <select key={defaultFolderId ?? "none"} id="ged-folder" name="folderId" className={selectClass} defaultValue={defaultFolderId ?? folders[0]?.id ?? ""} required>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <FieldError errors={fe?.folderId} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ged-title">Título</Label>
        <Input
          id="ged-title"
          name="title"
          placeholder={count > 1 ? "Vários arquivos: usa o nome de cada um" : "Opcional: usa o nome do arquivo"}
          disabled={count > 1}
          aria-invalid={fe?.title ? true : undefined}
        />
        <FieldError errors={fe?.title} />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : count > 1 ? `Enviar ${count}` : "Enviar"}
        </Button>
      </div>
      {state && !state.ok && !fe && (
        <p role="alert" className="text-sm text-danger md:col-span-4">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-success md:col-span-4">
          {state.data.ids.length === 1 ? "Documento enviado." : `${state.data.ids.length} documentos enviados.`}
        </p>
      )}
    </form>
  );
}
