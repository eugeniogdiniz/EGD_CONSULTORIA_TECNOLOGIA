"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { attachSignedContractForm } from "@/modules/contracts/form-actions";

/**
 * Sobe o PDF do contrato assinado fora do sistema (digitalizado ou com
 * assinatura eletrônica) com a data da assinatura: marca o contrato como
 * assinado e o arquivo vira o documento final, inclusive no portal.
 */
export function AttachSignedContractForm({ contractId, proposalId, replace = false }: { contractId: string; proposalId: string; replace?: boolean }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await attachSignedContractForm(prev, fd);
      if (r?.ok) setFileName(null);
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const inputId = `signed-file-${contractId}`;
  return (
    <form action={action} className="grid gap-3" encType="multipart/form-data" data-testid="contrato-assinado">
      <input type="hidden" name="id" value={contractId} />
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-sm border border-dashed border-strong bg-subtle p-4 text-center text-sm text-muted-foreground hover:bg-muted"
          >
            {fileName ?? (replace ? "Substituir o PDF assinado…" : "Selecionar o PDF assinado…")}
            <div className="type-micro text-faint">Contrato impresso e digitalizado, ou com assinatura eletrônica · PDF até 50 MB</div>
          </label>
          <input id={inputId} name="file" type="file" accept=".pdf,application/pdf" className="sr-only" required onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
          <FieldError errors={fe?.file} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`signed-at-${contractId}`}>Data da assinatura</Label>
          <Input id={`signed-at-${contractId}`} name="signedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-44" aria-invalid={fe?.signedAt ? true : undefined} />
          <FieldError errors={fe?.signedAt} />
        </div>
      </div>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Enviando…" : replace ? "Substituir contrato assinado" : "Anexar contrato assinado"}</Button>
      </div>
    </form>
  );
}
