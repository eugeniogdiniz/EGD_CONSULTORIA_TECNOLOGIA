"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { generateAcceptanceTermForm } from "@/modules/contracts/form-actions";

/** Gera (ou regenera) o termo de aceite da entrega aprovada, com ressalvas opcionais do dono. */
export function AcceptanceTermForm({ deliverableId, projectId, hasFile }: { deliverableId: string; projectId: string; hasFile: boolean }) {
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(generateAcceptanceTermForm, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-3" data-testid="termo-aceite">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-1.5">
        <Label htmlFor="reservations">Ressalvas <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="reservations" name="reservations" rows={2} maxLength={2000} placeholder="Pendências, responsável, prazo e impacto. Vazio: sem pendências." />
        <FieldError errors={fe?.reservations} />
      </div>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-success">Termo gerado.</p>}
      <div>
        <Button type="submit" size="sm" variant={hasFile ? "outline" : "default"} disabled={pending}>
          {pending ? "Gerando…" : hasFile ? "Gerar termo de novo" : "Gerar termo de aceite"}
        </Button>
      </div>
    </form>
  );
}
