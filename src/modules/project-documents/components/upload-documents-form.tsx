"use client";

import { useRef, useState } from "react";
import { uploadDocumentsForm } from "@/modules/project-documents/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-link-soft";

/** Igual a MAX_DOCUMENT_BYTES (files/keys): checagem antecipada, o servidor confere de novo. */
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_FILES = 20;

type Status =
  | { kind: "idle" }
  | { kind: "sending"; current: number; total: number; name: string }
  | { kind: "done"; sent: number; errors: string[] }
  | { kind: "invalid"; message: string };

/**
 * Envia os arquivos um por requisição: cada server action carrega um arquivo
 * só (até 100 MB), então vários arquivos grandes não estouram o limite do corpo.
 */
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
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ref = useRef<HTMLFormElement>(null);
  const sending = status.kind === "sending";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return setStatus({ kind: "invalid", message: "Selecione ao menos um arquivo." });
    if (files.length > MAX_FILES) return setStatus({ kind: "invalid", message: `Envie no máximo ${MAX_FILES} arquivos por vez.` });
    const big = files.find((f) => f.size > MAX_BYTES);
    if (big) return setStatus({ kind: "invalid", message: `"${big.name}" passa de 100 MB.` });

    const errors: string[] = [];
    let sent = 0;
    for (const [i, file] of files.entries()) {
      setStatus({ kind: "sending", current: i + 1, total: files.length, name: file.name });
      const one = new FormData();
      one.set("projectId", projectId);
      one.set("folderId", String(fd.get("folderId") ?? ""));
      if (files.length === 1) one.set("title", String(fd.get("title") ?? ""));
      one.set("files", file);
      try {
        const r = await uploadDocumentsForm(null, one);
        if (r?.ok) sent += 1;
        else errors.push(`${file.name}: ${r?.error ?? "falhou"}`);
      } catch {
        errors.push(`${file.name}: falha de conexão`);
      }
    }
    if (errors.length === 0) {
      ref.current?.reset();
      setCount(0);
    }
    setStatus({ kind: "done", sent, errors });
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[1.4fr_1fr_1.2fr_auto] md:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="ged-files">Arquivos</Label>
        <Input
          id="ged-files"
          name="files"
          type="file"
          multiple
          required
          disabled={sending}
          onChange={(e) => setCount(e.currentTarget.files?.length ?? 0)}
          aria-invalid={status.kind === "invalid" ? true : undefined}
        />
        <FieldError errors={status.kind === "invalid" ? [status.message] : undefined} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ged-folder">Pasta</Label>
        <select
          key={defaultFolderId ?? "none"}
          id="ged-folder"
          name="folderId"
          className={selectClass}
          defaultValue={defaultFolderId ?? folders[0]?.id ?? ""}
          disabled={sending}
          required
        >
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ged-title">Título</Label>
        <Input
          id="ged-title"
          name="title"
          maxLength={200}
          placeholder={count > 1 ? "Vários arquivos: usa o nome de cada um" : "Opcional: usa o nome do arquivo"}
          disabled={count > 1 || sending}
        />
      </div>
      <div>
        <Button type="submit" disabled={sending}>
          {sending ? "Enviando…" : count > 1 ? `Enviar ${count}` : "Enviar"}
        </Button>
      </div>
      {status.kind === "sending" && (
        <p role="status" className="text-sm text-muted-foreground md:col-span-4">
          Enviando {status.current} de {status.total}: {status.name}. Arquivos grandes levam alguns minutos; não feche a página.
        </p>
      )}
      {status.kind === "done" && status.sent > 0 && (
        <p role="status" className="text-sm text-success md:col-span-4">
          {status.sent === 1 ? "Documento enviado." : `${status.sent} documentos enviados.`}
        </p>
      )}
      {status.kind === "done" && status.errors.length > 0 && (
        <div role="alert" className="text-sm text-danger md:col-span-4">
          {status.errors.length === 1 ? "Não foi possível enviar:" : `Não foi possível enviar ${status.errors.length} arquivos:`}
          <ul className="mt-1 list-disc pl-5">
            {status.errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
