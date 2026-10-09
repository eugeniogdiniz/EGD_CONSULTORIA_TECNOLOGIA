"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { attachProposalFileForm } from "@/modules/crm/form-actions";
import type { ActionResult } from "@/lib/action-result";

/**
 * Anexa o arquivo da proposta (PDF, DOCX ou XLSX). A action devolve o erro de
 * validação (tipo, tamanho, arquivo vazio) e ele aparece aqui, em vez de virar
 * erro de servidor.
 */
export function AttachProposalFileForm({ proposalId, replace = false }: { proposalId: string; replace?: boolean }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await attachProposalFileForm(prev, fd);
      if (r?.ok) setFileName(null);
      return r;
    },
    null,
  );
  const error = state && !state.ok ? (state.fieldErrors ? Object.values(state.fieldErrors).flat().join(" ") : state.error) : null;
  const inputId = `p-file-${proposalId}`;
  return (
    <form action={formAction} className="grid gap-2" encType="multipart/form-data" data-testid="anexar-proposta">
      <input type="hidden" name="id" value={proposalId} />
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded-sm border border-dashed border-strong bg-subtle p-4 text-center text-sm text-muted-foreground hover:bg-muted"
      >
        {fileName ?? (replace ? "Substituir arquivo…" : "Selecionar arquivo…")}
        <div className="type-micro text-faint">PDF, DOCX ou XLSX até 50 MB</div>
      </label>
      <input
        id={inputId}
        name="file"
        type="file"
        accept=".pdf,.docx,.xlsx,application/pdf"
        className="sr-only"
        required
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Enviando…" : "Enviar arquivo"}</Button>
      </div>
    </form>
  );
}
