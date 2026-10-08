"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { markContractSignedForm } from "@/modules/contracts/form-actions";

export function SignContractForm({ contractId, proposalId }: { contractId: string; proposalId: string }) {
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(markContractSignedForm, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2" data-testid="assinatura">
      <input type="hidden" name="id" value={contractId} />
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="grid gap-1.5">
        <Label htmlFor="signedAt">Data da assinatura</Label>
        <Input id="signedAt" name="signedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-44" />
        <FieldError errors={fe?.signedAt} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Registrando…" : "Marcar como assinado"}</Button>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
