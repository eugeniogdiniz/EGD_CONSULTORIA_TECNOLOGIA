"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { addDeliverableAttachmentForm, deleteDeliverableAttachmentForm } from "@/modules/projects/form-actions";
import { formatBytes, formatDateTime } from "@/lib/format";

/** Igual a MAX_DOCUMENT_BYTES (files/keys): checagem antecipada, o servidor confere de novo. */
const MAX_BYTES = 100 * 1024 * 1024;

export type AttachmentItem = {
  id: string;
  fileId: string;
  name: string;
  sizeBytes: number;
  createdAt: Date | string;
  uploadedByName: string;
};

type Status = { kind: "idle" } | { kind: "sending"; current: number; total: number; name: string } | { kind: "done"; sent: number; errors: string[] };

/**
 * Anexos da entrega: lista com download e exclusão, e envio de vários
 * arquivos (um por requisição, até 100 MB cada). Usado no diálogo do card do
 * kanban e na página da entrega.
 */
export function DeliverableAttachments({
  deliverableId,
  attachments,
  readOnly = false,
  compact = false,
}: {
  deliverableId: string;
  attachments: AttachmentItem[];
  readOnly?: boolean;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const sending = status.kind === "sending";
  const inputId = `anexos-${deliverableId}`;

  async function send(list: File[]) {
    const files = list.filter((f) => f.size > 0);
    if (files.length === 0) return;
    const errors: string[] = [];
    let sent = 0;
    for (const [i, file] of files.entries()) {
      setStatus({ kind: "sending", current: i + 1, total: files.length, name: file.name });
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: passa de 100 MB`);
        continue;
      }
      const fd = new FormData();
      fd.set("deliverableId", deliverableId);
      fd.set("file", file);
      try {
        const r = await addDeliverableAttachmentForm(null, fd);
        if (r?.ok) sent += 1;
        else errors.push(`${file.name}: ${r?.error ?? "falhou"}`);
      } catch {
        errors.push(`${file.name}: falha de conexão`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    setStatus({ kind: "done", sent, errors });
  }

  return (
    <div className="grid gap-3" data-testid="anexos-entrega">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum anexo nesta entrega.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" title={a.name}>{a.name}</div>
                <div className="type-micro text-muted-foreground">
                  {formatBytes(a.sizeBytes)}
                  {compact ? "" : ` · ${a.uploadedByName} · ${formatDateTime(new Date(a.createdAt))}`}
                </div>
              </div>
              <a
                href={`/admin/arquivos/${a.fileId}/baixar`}
                target="_blank"
                rel="noopener"
                className="text-xs font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong"
              >
                Baixar
              </a>
              {!readOnly && (
                <ConfirmAction
                  trigger={<button type="button" className="text-xs text-danger hover:underline">Excluir</button>}
                  title="Excluir anexo?"
                  description={`"${a.name}" sai da entrega e o arquivo é apagado. Não dá para desfazer.`}
                  confirmLabel="Excluir"
                  action={deleteDeliverableAttachmentForm}
                  fields={{ id: a.id }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="sr-only">Anexar arquivos à entrega</label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            multiple
            disabled={sending}
            className="sr-only"
            onChange={(e) => send(Array.from(e.currentTarget.files ?? []))}
          />
          <Button type="button" variant="secondary" size="sm" disabled={sending} onClick={() => inputRef.current?.click()}>
            {sending ? "Enviando…" : "Anexar arquivos"}
          </Button>
          <span className="type-micro text-faint">até 100 MB por arquivo</span>
        </div>
      )}

      {status.kind === "sending" && (
        <p role="status" className="text-xs text-muted-foreground">
          Enviando {status.current} de {status.total}: {status.name}. Arquivos grandes levam alguns minutos.
        </p>
      )}
      {status.kind === "done" && status.sent > 0 && status.errors.length === 0 && (
        <p role="status" className="text-xs text-success">{status.sent === 1 ? "Arquivo anexado." : `${status.sent} arquivos anexados.`}</p>
      )}
      {status.kind === "done" && status.errors.length > 0 && (
        <div role="alert" className="text-xs text-danger">
          {status.sent > 0 ? `${status.sent} anexado(s); não foi possível enviar:` : "Não foi possível enviar:"}
          <ul className="mt-1 list-disc pl-5">
            {status.errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
